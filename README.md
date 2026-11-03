# MWW Wachtwoord Held 🔐

Een vrolijke website voor basisschoolkinderen om te leren hoe je een sterk wachtwoord maakt.

Kinderen typen een wachtwoord en zien meteen hoe lang een hacker nodig heeft om het te raden (brute force). Bij elke letter of elk teken wordt de schatting opnieuw berekend. Een checklist laat zien wat er gebeurt als je hoofdletters, cijfers, speciale tekens of meer tekens toevoegt.

## Privacy

Alles gebeurt in de browser van het kind. Er wordt niets opgeslagen en niets verstuurd. De pagina gebruikt geen externe scripts, lettertypes of trackers, en een Content Security Policy blokkeert alle netwerkverbindingen.

## Hoe wordt de tijd berekend?

Aantal mogelijke tekens (kleine letters 26, hoofdletters 26, cijfers 10, speciale tekens 33) tot de macht van de lengte van het wachtwoord. Een hacker vindt het gemiddeld na de helft van alle mogelijkheden, bij 10 miljard pogingen per seconde. Bekende wachtwoorden zoals `123456` of `wachtwoord` worden altijd als "meteen gekraakt" getoond.

## Publiceren met GitHub Pages

Ga naar **Settings > Pages**, kies bij Source **Deploy from a branch**, selecteer `main` en map `/ (root)` en klik op Save.

## Lokaal bekijken

Open `index.html` in je browser, of start `python3 -m http.server` in deze map.
