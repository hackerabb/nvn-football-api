const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = "e91d644564bb177175b5c6dfef6b0db9";

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET');
    next();
});

app.get('/live', async (req, res) => {
    try {
        const category = (req.query.type || 'football').toLowerCase();
        let sportKey = "soccer";
        
        if (category === "basketball") sportKey = "basketball";
        if (category === "tennis") sportKey = "tennis";

        // تعديل الرابط لطلب جميع الأسواق المتاحة (h2h, btts, totals, spreads, outlines)
        const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h,totals,spreads,btts&oddsFormat=decimal`;
        
        const response = await axios.get(url, { timeout: 12000 });
        const jsonData = response.data;
        const results = [];

        if (Array.isArray(jsonData) && jsonData.length > 0) {
            jsonData.forEach(game => {
                const team1 = game.home_team ? game.home_team.trim() : "";
                const team2 = game.away_team ? game.away_team.trim() : "";
                const bookmakers = game.bookmakers || [];

                if (team1 && team2 && bookmakers.length > 0) {
                    // نجمع كل الأسواق المتاحة للمباراة من أول موقع مراهنات موثوق
                    const marketsData = {};
                    
                    bookmakers[0].markets.forEach(mkt => {
                        const marketKey = mkt.key; // h2h, totals, btts...
                        marketsData[marketKey] = mkt.outcomes.map(out => ({
                            name: out.name,
                            price: out.price,
                            point: out.point || null // للأهداف والمجاميع والهانديكاب
                        }));
                    });

                    results.push({
                        match: `${team1} vs ${team2}`,
                        commence_time: game.commence_time,
                        all_markets: marketsData
                    });
                }
            });
        }

        res.json({ status: "success", category, count: results.length, results });

    } catch (error) {
        res.json({ status: "success", category: req.query.type || 'football', count: 0, results: [], error_log: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
