# MWW Wachtwoord Held 🔐

Een vrolijke website voor basisschoolkinderen bij een les over cybercrime en het kraken van wachtwoorden. De les bestaat uit drie opdrachten.

## De opdrachten

1. **Kraak de pincode 🚲** (`opdracht-1/`)
   Een fietsslot met een geheime code van 4 verschillende cijfers. Draai aan de wieltjes of typ de cijfers in en kraak het slot voordat de tijd op is (Makkelijk 3 minuten, Normaal 2 minuten, Moeilijk 1,5 minuut). Na elke poging kleuren de cijfers: groen is goed op de goede plek, oranje zit in de code maar op een andere plek, grijs zit er niet in. Alle pogingen staan in een lijstje ernaast.
2. **Raad het wachtwoord 🔨** (`opdracht-2/`)
   Brute force oefenen: raad een wachtwoord van 1, 2 en 3 kleine letters, letter voor letter. Daarna kraakt een computer een wachtwoord van 12 letters. Tot slot zien de kinderen hoe het echt zit: zonder hints zijn er 26¹² (95 biljard) mogelijkheden. Met de hand duurt dat ruim 3 miljard jaar, met een computer ongeveer 110 dagen.
3. **Maak een supersterk wachtwoord 💪** (`opdracht-3/`)
   Typ een wachtwoord en zie meteen hoe lang een hacker nodig heeft om het te raden. Bij elke letter of elk teken wordt de schatting opnieuw berekend. Een checklist laat zien wat er gebeurt als je hoofdletters, cijfers, speciale tekens of meer tekens toevoegt.

De startpagina (`index.html`) linkt naar alle drie de opdrachten.

## Privacy

Alles gebeurt in de browser van het kind. Er wordt niets opgeslagen en niets verstuurd. De pagina's gebruiken geen externe scripts, lettertypes of trackers, en een Content Security Policy blokkeert alle netwerkverbindingen. Geluid staat standaard uit en kan met de knop rechtsboven aangezet worden.

## Hoe wordt de tijd berekend? (opdracht 3)

Aantal mogelijke tekens (kleine letters 26, hoofdletters 26, cijfers 10, speciale tekens 33) tot de macht van de lengte van het wachtwoord. Een hacker vindt het gemiddeld na de helft van alle mogelijkheden, bij 10 miljard pogingen per seconde. Bekende wachtwoorden zoals `123456` of `wachtwoord` worden altijd als "meteen gekraakt" getoond.

## Mappen

- `assets/` gedeelde stijl (`base.css`), startpagina (`home.css`) en confetti en geluid (`common.js`)
- `opdracht-1/`, `opdracht-2/`, `opdracht-3/` elke opdracht met een eigen pagina, stijl en script

## Publiceren met GitHub Pages

Ga naar **Settings > Pages**, kies bij Source **Deploy from a branch**, selecteer `main` en map `/ (root)` en klik op Save.

## Lokaal bekijken

Start `python3 -m http.server` in deze map en open `http://localhost:8000`.
