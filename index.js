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

        const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey={API_KEY}&regions=eu&markets=h2h`;
        
        const response = await axios.get(url, { timeout: 12000 });
        const jsonData = response.data;
        const results = [];

        // الحصول على تاريخ اليوم الحالي بصيغة YYYY-MM-DD
        const todayStr = new Date().toISOString().split('T')[0];

        if (Array.isArray(jsonData) && jsonData.length > 0) {
            jsonData.forEach(game => {
                // فلترة مباريات اليوم فقط
                const gameTime = game.commence_time; 
                if (!gameTime || !gameTime.startsWith(todayStr)) {
                    return; // تخطي أي مباراة ليست اليوم
                }

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
                            // التحقق من وجود خيار التعادل (X) في بعض أسواق كرة القدم
                            const oX = outcomes.length === 3 ? outcomes[2].price : null;

                            if (o1 > 0 && o2 > 0) {
                                // 1. التوقع الرئيسي للفائز
                                let prediction = o1 < o2 ? "W1" : "W2";
                                if (oX && Math.abs(o1 - o2) < 0.3) {
                                    prediction = "X (Draw)";
                                }

                                const minOdd = Math.min(o1, o2);
                                let prob = Math.floor(100 - (minOdd * 15));
                                prob = Math.max(60, Math.min(prob, 95));

                                // 2. تحليل معظم الرهانات البديلة (الرهان الآمن والذكاء الاصطناعي)
                                let betTip = "";
                                if (Math.abs(o1 - o2) > 1.5) {
                                    betTip = o1 < o2 ? "Handicap (1) -1" : "Handicap (2) -1";
                                } else if (Math.abs(o1 - o2) < 0.5) {
                                    betTip = "Double Chance (1X) or Under 3.5 Goals";
                                } else {
                                    betTip = o1 < o2 ? "Double Chance (1X)" : "Double Chance (2X)";
                                }

                                results.push({
                                    match: `${team1} vs ${team2}`,
                                    time: gameTime,
                                    odds: {
                                        home: o1.toFixed(2),
                                        away: o2.toFixed(2),
                                        draw: oX ? oX.toFixed(2) : "N/A"
                                    },
                                    main_prediction: prediction,
                                    probability: `${prob}%`,
                                    safe_bet_tip: betTip,
                                    goals_prediction: minOdd < 2.0 ? "Over 1.5 Goals" : "Multi Goals 1-3"
                                });
                            }
                        }
                    }
                }
            });
        }

        res.json({ 
            status: "success", 
            date: todayStr,
            category, 
            count: results.length, 
            results 
        });

    } catch (error) {
        res.json({ status: "success", count: 0, results: [], error_log: error.message });
    }
});

app.listen(PORT);
module.exports = app;
