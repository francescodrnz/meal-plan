#!/usr/bin/env python3
"""Genera ricette.json dai database Notion Ricette, Ingredienti e Prodotti.

Uso: NOTION_TOKEN=ntn_... python3 .github/scripts/ricette.py
Solo libreria standard. Se qualcosa va storto esce con codice 1 e non tocca
ricette.json. Formato del file nel README del repo.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

NOTION_VERSION = "2025-09-03"
DS_RICETTE = "63257d90-c4da-474e-83af-140df3cbed09"
DS_INGREDIENTI = "608a25a6-31ad-4682-9f9d-53dc3b52dae8"
DS_PRODOTTI = "8cfa9414-d7ba-45fe-9f1a-2aec52a90867"
USCITA = Path(__file__).resolve().parents[2] / "ricette.json"

PAUSA = 0.35  # Notion regge circa 3 richieste al secondo
TENTATIVI = 3

avvisi = []


def avvisa(testo):
    avvisi.append(testo)
    print("avviso:", testo, file=sys.stderr)


def richiesta(metodo, percorso, corpo=None):
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        raise RuntimeError("manca NOTION_TOKEN")
    dati = json.dumps(corpo).encode() if corpo is not None else None
    for tentativo in range(1, TENTATIVI + 1):
        req = urllib.request.Request(
            "https://api.notion.com/v1" + percorso,
            data=dati,
            method=metodo,
            headers={
                "Authorization": "Bearer " + token,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            },
        )
        time.sleep(PAUSA)
        try:
            with urllib.request.urlopen(req, timeout=30) as risposta:
                return json.load(risposta)
        except urllib.error.HTTPError as e:
            # 429 = rate limit, 5xx = Notion in difficoltà: si riprova
            if tentativo < TENTATIVI and (e.code == 429 or e.code >= 500):
                attesa = float(e.headers.get("Retry-After") or 2 * tentativo)
                print(f"{e.code} su {percorso}, riprovo fra {attesa:.0f} s", file=sys.stderr)
                time.sleep(attesa)
                continue
            raise RuntimeError(f"{metodo} {percorso}: {e.code} {e.read().decode(errors='replace')[:300]}")
        except (urllib.error.URLError, TimeoutError) as e:
            if tentativo < TENTATIVI:
                print(f"rete: {e} su {percorso}, riprovo", file=sys.stderr)
                time.sleep(2 * tentativo)
                continue
            raise RuntimeError(f"{metodo} {percorso}: {e}")


def tutte_le_righe(data_source):
    righe, cursore = [], None
    while True:
        corpo = {"page_size": 100}
        if cursore:
            corpo["start_cursor"] = cursore
        r = richiesta("POST", f"/data_sources/{data_source}/query", corpo)
        righe += r["results"]
        if not r["has_more"]:
            return [p for p in righe if not p.get("in_trash")]
        cursore = r["next_cursor"]


def tutti_i_figli(blocco):
    figli, cursore = [], None
    while True:
        percorso = f"/blocks/{blocco}/children?page_size=100"
        if cursore:
            percorso += "&start_cursor=" + cursore
        r = richiesta("GET", percorso)
        figli += r["results"]
        if not r["has_more"]:
            return figli
        cursore = r["next_cursor"]


def relazione(pagina, nome):
    prop = pagina["properties"][nome]
    ids = [x["id"] for x in prop["relation"]]
    if not prop.get("has_more"):
        return ids
    # Nella pagina la relazione si ferma a 25 voci: il resto si legge a parte
    ids, cursore = [], None
    while True:
        percorso = f"/pages/{pagina['id']}/properties/{prop['id']}?page_size=100"
        if cursore:
            percorso += "&start_cursor=" + cursore
        r = richiesta("GET", percorso)
        ids += [x["relation"]["id"] for x in r["results"]]
        if not r["has_more"]:
            return ids
        cursore = r["next_cursor"]


def testo(rich_text):
    return "".join(t["plain_text"] for t in rich_text).strip()


def titolo(pagina, nome):
    return testo(pagina["properties"][nome]["title"])


def campo(pagina, nome):
    prop = pagina["properties"][nome]
    valore = prop[prop["type"]]
    if prop["type"] == "rich_text":
        return testo(valore)
    if prop["type"] == "select":
        return valore["name"] if valore else None
    if prop["type"] == "multi_select":
        return [o["name"] for o in valore]
    return valore  # number, checkbox


def testo_blocco(blocco):
    return testo(blocco.get(blocco["type"], {}).get("rich_text", []))


def voce(blocco):
    """Un punto con il suo testo e, se ci sono, i sotto-punti (un livello)."""
    v = {"testo": testo_blocco(blocco)}
    if blocco["has_children"]:
        sotto = [testo_blocco(f) for f in tutti_i_figli(blocco["id"])]
        v["sotto"] = [s for s in sotto if s]
    return v


def corpo_ricetta(ricetta, nome):
    """Passi sotto "Procedimento", note sotto "Note"; il resto si salta."""
    passi, note, sezione = [], [], None
    for b in tutti_i_figli(ricetta["id"]):
        tipo = b["type"]
        if tipo.startswith("heading_"):
            sezione = testo_blocco(b).lower()
            continue
        if sezione not in ("procedimento", "note") or not testo_blocco(b):
            continue
        if sezione == "procedimento" and tipo == "numbered_list_item":
            passi.append(voce(b))
        elif sezione == "note" and tipo in ("bulleted_list_item", "paragraph"):
            note.append(voce(b))
        else:
            avvisa(f"{nome}: blocco {tipo} in {sezione} non esportato")
    if not passi:
        avvisa(f"{nome}: nessun passo nel procedimento")
    return passi, note


def per_nome(x):
    return (x["nome"].casefold(), x["id"])


def main():
    prodotti = [
        {
            "id": p["id"],
            "nome": titolo(p, "Nome"),
            "reparto": campo(p, "Reparto"),
            "unita": campo(p, "Unità"),
            "confezione": campo(p, "Confezione"),
            "tipoConfezione": campo(p, "Tipo confezione"),
            "siConta": campo(p, "Si conta in dispensa"),
        }
        for p in tutte_le_righe(DS_PRODOTTI)
    ]
    id_prodotti = {p["id"] for p in prodotti}
    ingredienti = {i["id"]: i for i in tutte_le_righe(DS_INGREDIENTI)}
    ricette_notion = tutte_le_righe(DS_RICETTE)
    if not prodotti or not ricette_notion:
        raise RuntimeError("Notion non restituisce ricette o prodotti: la connessione ha ancora accesso?")

    ricette = []
    for r in ricette_notion:
        nome = titolo(r, "Nome")
        lista = []
        for id_ing in relazione(r, "Ingredienti"):
            i = ingredienti.get(id_ing)
            if i is None:
                avvisa(f"{nome}: ingrediente {id_ing} non trovato")
                continue
            prodotto = (relazione(i, "Prodotto") or [None])[0]
            unita = campo(i, "Unità")
            tipo = campo(i, "Tipo")
            nome_ing = titolo(i, "Ingrediente")
            if prodotto is None and tipo != "Non si compra":
                avvisa(f"{nome}: {nome_ing} senza prodotto")
            elif prodotto is not None and prodotto not in id_prodotti:
                avvisa(f"{nome}: {nome_ing} collegato a un prodotto che non esiste")
            lista.append({
                "nome": nome_ing,
                "quantita": None if unita == "q.b." else campo(i, "Quantità per porzione"),
                "unita": unita,
                "prodotto": prodotto,
                "tipo": tipo,
                "facoltativo": campo(i, "Facoltativo"),
                "nota": campo(i, "Nota"),
            })
        passi, note = corpo_ricetta(r, nome)
        icona = r.get("icon") or {}
        icona = icona.get("emoji") if icona.get("type") == "emoji" else None
        if icona is None:
            avvisa(f"{nome}: senza icona emoji")
        ricette.append({
            "id": r["id"],
            "nome": nome,
            "icona": icona,
            "rotazione": campo(r, "In rotazione"),
            "provata": campo(r, "Provata"),
            "porzioni": campo(r, "Porzioni"),
            "kcal": campo(r, "Kcal/porzione"),
            "proteine": campo(r, "Proteine/porzione (g)"),
            "base": campo(r, "Base"),
            "descrizione": campo(r, "Note"),
            "ingredienti": lista,
            "passi": passi,
            "note": note,
        })

    dati = {
        "versione": 1,
        "prodotti": sorted(prodotti, key=per_nome),
        "ricette": sorted(ricette, key=per_nome),
    }
    temporaneo = USCITA.with_suffix(".json.tmp")
    temporaneo.write_text(json.dumps(dati, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporaneo, USCITA)
    print(f"{len(ricette)} ricette, {len(prodotti)} prodotti, {len(avvisi)} avvisi")

    riepilogo = os.environ.get("GITHUB_STEP_SUMMARY")
    if riepilogo:
        with open(riepilogo, "a", encoding="utf-8") as f:
            f.write(f"{len(ricette)} ricette, {len(prodotti)} prodotti\n\n")
            f.writelines(f"- {a}\n" for a in avvisi)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("errore:", e, file=sys.stderr)
        sys.exit(1)
