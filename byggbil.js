

const http = require('http');
const pgp = require('pg-promise')();
const url = require('url');

const sqlConn = pgp({
    user: 'an5621',
    password: '******',
    database: 'an5621',
    host: 'pgserver.mau.se',
    client_encoding: 'UTF8'
});

const sendBasePage = (resp) => {
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>byggbil</title>");
    resp.write("<code><h1>Välkommen till Bil sidan!</h1>");

    resp.write("Nedan är våra modeller. Kolla vilka tillval som finns till bilmodellerna");
    resp.write("<form action='/priser' method='GET'>");
    resp.write("<input type='submit' value='Sök'>");
    resp.write("</form> <hr>");

    resp.write("<form action='/regnr' method='GET'>\n");
    resp.write("<br> Sök på ett registreringsnummer för att se modell och baspris: <br><br> <input type='text' name='regnr'><br>\n");
    resp.write("<input type='submit' value='Sök'>\n");
    resp.write("</form>\n <hr>");

    resp.write("<form action='/ferg' method='GET'>\n");
    resp.write("Sök på en färg för att se vilka modeller som har den färgen och vad färgen kostar: <br><br> <input type='text' name='färg'><br>\n");
    resp.write("<input type='submit' value='Sök'>\n");
    resp.write("</form>\n <hr>");

    resp.write("Kolla alla möjliga priser <br>");
    resp.write("<form action='/allapriser' method='GET'>");
    resp.write("<input type='submit' value='Se alla priser'>");
    resp.write("</form>");
    resp.end();
}

const sendNotFound = (req, resp) => {
    resp.statusCode = 404;
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>finns ej</title>");
    resp.write("Kan inte hitta " + req.url)
    resp.end();
}

const sendCarInfoPage = (regnr, resp) => {
    const handleCarInfo = (rows) => {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bilinformation</title>\n");
        resp.write("<ul>\n");

        if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
            resp.write("<li><code>" + rows[i].regnr.toUpperCase() + ": <code>" + rows[i].tillverkare + "</code> <code>" + rows[i].modell_namn + "</code>, <code>" + "Baspris " + "<b>" +  rows[i].baspris +"</b>" + " SEK</code></li>\n");
        }
     } else {
            resp.write("<li>Regnummret:" + regnr.toUpperCase() + " finns inte.</li>\n");
        }
        resp.end("</ul>");
    };

    const handleError = (err) => {
        console.log("Error regnr", err);
        resp.end();
    };

    sqlConn.any('select * from bil where regnr = lower ($1)', [regnr])
        .then(handleCarInfo)
        .catch(handleError);
}

const sendPriser = (priser, resp) => {
    const handlePriser = (rows) => {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Priser</title>\n");
        resp.write("<ul>\n");

            for (let i = 0; i < rows.length; i++) {
                resp.write("<li><code>" +rows[i].tillverkare + "</code> <code>" + rows[i].modell_namn + ": " + rows[i].tillval_namn + "</code> <code>" + "<b>" + rows[i].tillval_pris + "</b>" + " SEK </code></li>\n");
            }
        
        resp.end("</ul>");
    };

    const handleError = (err) => {
        console.log("Error priser:", err);
        resp.end();
    };
  
    sqlConn.any(`select modell_namn, tillval_namn, tillval_pris, tillverkare
    from bil 
    join tillval on bil.regnr = tillval.regnr
    where modell_namn = $1;`,[priser])
    .then(handlePriser)
    .catch(handleError);

}

const sendFärg = (färg, resp) => {
    const handleFärg = (rows) => {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>färg</title>\n");
        resp.write("<ul>\n");

        if (rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                resp.write("<li>" +"<code>" + "<b>" +  rows[i].färg_namn +"</b>" + "<code>" + " färg finns på modellen " + "<b>" +  rows[i].modell_namn + "</b>" + "<code>" + " och kostar: " + "<b>" + rows[i].färg_pris + "</b>" + " SEK</code></li>\n");
            }
         } else {
                resp.write("<li>Färgen:" + färg  + " finns inte.</li>\n");
            }
            resp.end("</ul>");
        };
    
        const handleError = (err) => {
            console.log("Error färg", err);
            resp.end();
        };

    sqlConn.any(`select modell_namn, färg_namn, färg_pris
    from bil 
    join färg on bil.regnr = färg.regnr
    where färg_namn = lower ($1);`, [färg])
    .then(handleFärg)
    .catch(handleError);
    
}

const sendAllapriser = (resp) => {
    const handleAllapriser = (rows) => {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Alla priser</title>\n");
        resp.write("<ul>\n");

            for (let i = 0; i < rows.length; i++) {
                resp.write("<li>" +"<code>" + "<b>" + rows[i].färg_namn + "</b>"   + " " + "<code>" +  rows[i].tillverkare  + " " + "<code>" +  rows[i].modell_namn + " med tillvalet"+  " <code>" + "<b>" + rows[i].tillval_namn + "</b>"+ " <code>" + " kostar: " + "<b>" + rows[i].totalpris + "</b>" + " SEK </code></li>\n");
            }
            resp.end("</ul>");
    };
    const handleError = (err) => {
        console.log("Error alla priser", err);
        resp.end();
    };
    sqlConn.any(`select modell_namn, tillverkare, tillval_namn, färg_namn, baspris + tillval_pris + färg_pris
    as totalpris from bil
    join tillval on bil.regnr = tillval.regnr
    join färg on bil.regnr = färg.regnr;`,)
    .then(handleAllapriser)
    .catch(handleError);
       
}

const handleWebRequest = (req, resp) => {
    const parsed = url.parse(req.url, true);

    if (req.url == "/" || req.url == "/index.html") {
        sendBasePage(resp);
    } else if (parsed.pathname == "/regnr" && req.method == 'GET') {
        const regnr = parsed.query.regnr;
        sendCarInfoPage(regnr, resp);
    } else if (parsed.pathname == '/priser' && req.method == 'GET') {
        const priser = parsed.query.priser;
        sendPriser (priser, resp); 
    } else if (parsed.pathname == '/ferg' && req.method == 'GET') {
        const färg = parsed.query.färg;
        sendFärg (färg, resp); 
    } else if (parsed.pathname == "/allapriser" && req.method == 'GET'){
        sendAllapriser (resp); 
    } else {
        sendNotFound(req, resp);
    }
}

const httpConn = http.createServer(handleWebRequest);
const port = 8888;
httpConn.listen(port);
console.log("surfa in på http://localhost:" + port);
