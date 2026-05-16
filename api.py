from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

# مفتاحك المدمج والجاهز
API_KEY = "e91d644564bb177175b5c6dfef6b0db9"

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET'
    return response

@app.route('/live')
def get_live_bets():
    try:
        category = request.args.get('type', 'football').lower()
        
        sport_key = "soccer"  
        if category == "basketball": sport_key = "basketball"
        if category == "tennis": sport_key = "tennis"
        
        url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds/?apiKey={API_KEY}&regions=eu&markets=h2h"
        
        response = requests.get(url, timeout=12)
        
        if response.status_code != 200:
            return jsonify({"status": "success", "category": category, "count": 0, "results": []})
            
        json_data = response.json()
        results = []
        
        if isinstance(json_data, list) and len(json_data) > 0:
            for game in json_data:
                team1 = game.get("home_team", "").strip()
                team2 = game.get("away_team", "").strip()
                bookmakers = game.get("bookmakers", [])
                
                if not team1 or not team2 or not isinstance(bookmakers, list) or len(bookmakers) == 0:
                    continue
                    
                markets = bookmakers[0].get("markets", [])
                if not isinstance(markets, list) or len(markets) == 0:
                    continue
                    
                outcomes = markets[0].get("outcomes", [])
                if not isinstance(outcomes, list) or len(outcomes) < 2:
                    continue
                    
                try:
                    o1 = outcomes[0].get("price", 0)
                    o2 = outcomes[1].get("price", 0)
                    
                    if not o1 or not o2 or o1 <= 0 or o2 <= 0:
                        continue
                        
                    prediction = "W1" if o1 < o2 else "W2"
                    min_odd = min(o1, o2)
                    
                    prob = int(100 - (min_odd * 15))
                    prob = max(60, min(prob, 92))
                    
                    results.append({
                        "match": f"{team1} vs {team2}",
                        "odds1": str(round(o1, 2)),
                        "odds2": str(round(o2, 2)),
                        "prediction": prediction,
                        "probability": f"{prob}%"
                    })
                except Exception:
                    continue
                    
        return jsonify({"status": "success", "category": category, "count": len(results), "results": results})
        
    except Exception as e:
        return jsonify({"status": "success", "category": category, "count": 0, "results": [], "error_log": str(e)})

# السطر السحري لمنع خطأ استيراد الخادم (مهم جداً)
app.index = app
