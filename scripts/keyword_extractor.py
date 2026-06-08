import sys
import pandas as pd
from pytrends.request import TrendReq
import time

def extract_trends(seed_keyword, hl='it-IT', tz=360, geo='IT'):
    """
    Estrae query correlate (Top e Rising) per una parola chiave seme in Italia.
    """
    print(f"[*] Inizializzazione PyTrends per la query: '{seed_keyword}' (Geo: {geo})...")
    pytrends = TrendReq(hl=hl, tz=tz)
    
    try:
        # Costruzione del payload
        pytrends.build_payload([seed_keyword], cat=0, timeframe='today 12-m', geo=geo, gprop='')
        
        # Estrazione delle query correlate
        related_queries = pytrends.related_queries()
        
        if not related_queries or seed_keyword not in related_queries:
            print(f"[!] Nessun dato trovato per '{seed_keyword}'.")
            return
            
        data = related_queries[seed_keyword]
        
        # Estrazione Top e Rising
        top_df = data['top']
        rising_df = data['rising']
        
        print(f"\n[+] RISULTATI PER '{seed_keyword.upper()}':")
        
        if top_df is not None and not top_df.empty:
            print("\n--- TOP QUERY CORRELATE (Indice di interesse 0-100) ---")
            print(top_df.to_string(index=False))
            top_file = f"scripts/trends_top_{seed_keyword.replace(' ', '_')}.csv"
            top_df.to_csv(top_file, index=False)
            print(f"-> Salvato in: {top_file}")
        else:
            print("\n--- Nessuna Top Query correlata trovata.")
            
        if rising_df is not None and not rising_df.empty:
            print("\n--- RISING QUERY (Query in forte crescita percentuale o breakout) ---")
            print(rising_df.to_string(index=False))
            rising_file = f"scripts/trends_rising_{seed_keyword.replace(' ', '_')}.csv"
            rising_df.to_csv(rising_file, index=False)
            print(f"-> Salvato in: {rising_file}")
        else:
            print("\n--- Nessuna Rising Query correlata trovata.")
            
    except Exception as e:
        print(f"[!] Errore durante l'estrazione: {e}")
        print("[!] Nota: Google Trends ha limiti di rate-limiting molto stringenti. Se ricevi un errore 429, attendi qualche minuto o prova a usare una connessione/VPN diversa.")

if __name__ == "__main__":
    # Keyword di default se non specificata da riga di comando
    default_keyword = "sito web ristorante"
    keyword = sys.argv[1] if len(sys.argv) > 1 else default_keyword
    
    extract_trends(keyword)
