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
        
        // خريطة لتحديد الرياضة بناءً على الطلب
        if (category === "basketball") sportKey = "basketball";
        if (category === "tennis") sportKey = "tennis";
        if (category === "handball") sportKey = "handball";
        if (category === "hockey") sportKey = "icehockey";
        if (category === "baseball") sportKey = "baseball";

        const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h`;
        
        const response = await axios.get(url, { timeout: 12000 });
        const jsonData = response.data;
        const results = [];

        if (Array.isArray(jsonData) && jsonData.length > 0) {
            jsonData.forEach(game => {
                const team1 = game.home_team ? game.home_team.trim() : "";
                const team2 = game.away_team ? game.away_team.trim() : "";
                const bookmakers = game.bookmakers || [];

                if (team1 && team2 && bookmakers.length > 0) {
                    const markets = bookmakers[0].markets || [];
                    if (markets.length > 0) {
                        const outcomes = markets[0].outcomes || [];
                        if (outcomes.length >= 2) {
                            const o1 = outcomes[0].price || 0;
                            const o2 = outcomes[1].price || 0;

                            if (o1 > 0 && o2 > 0) {
                                const prediction = o1 < o2 ? "W1" : "W2";
                                const minOdd = Math.min(o1, o2);
                                
                                let prob = Math.floor(100 - (minOdd * 15));
                                prob = Math.max(60, Math.min(prob, 92));

                                results.push({
                                    match: `${team1} vs ${team2}`,
                                    odds1: o1.toFixed(2),
                                    odds2: o2.toFixed(2),
                                    prediction: prediction,
                                    probability: `${prob}%`
                                });
                            }
                        }
                    }
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
