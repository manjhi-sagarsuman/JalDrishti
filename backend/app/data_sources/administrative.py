"""
Indian Administrative Boundaries & Hierarchy Provider (Survey of India / LGD / DataMeet)
"""
from typing import Dict, Any, List, Optional
from .registry import get_data_source

ADMIN_META = get_data_source("india_admin_gis")

# Authoritative Indian administrative hierarchy
INDIAN_STATES = [
    {"code": "MH", "name": "Maharashtra", "type": "State", "capital": "Mumbai", "center": [75.7139, 19.7515], "districts_count": 36},
    {"code": "KA", "name": "Karnataka", "type": "State", "capital": "Bengaluru", "center": [75.7139, 15.3173], "districts_count": 31},
    {"code": "MP", "name": "Madhya Pradesh", "type": "State", "capital": "Bhopal", "center": [78.6569, 22.9734], "districts_count": 55},
    {"code": "GJ", "name": "Gujarat", "type": "State", "capital": "Gandhinagar", "center": [71.1924, 22.2587], "districts_count": 33},
    {"code": "TG", "name": "Telangana", "type": "State", "capital": "Hyderabad", "center": [79.0193, 18.1124], "districts_count": 33},
    {"code": "RJ", "name": "Rajasthan", "type": "State", "capital": "Jaipur", "center": [74.2179, 27.0238], "districts_count": 50},
    {"code": "AP", "name": "Andhra Pradesh", "type": "State", "capital": "Amaravati", "center": [79.7400, 15.9129], "districts_count": 26},
    {"code": "TN", "name": "Tamil Nadu", "type": "State", "capital": "Chennai", "center": [78.6569, 11.1271], "districts_count": 38},
    {"code": "UP", "name": "Uttar Pradesh", "type": "State", "capital": "Lucknow", "center": [80.9462, 26.8467], "districts_count": 75},
    {"code": "BR", "name": "Bihar", "type": "State", "capital": "Patna", "center": [85.3131, 25.0961], "districts_count": 38},
]

MAHARASHTRA_DISTRICTS = [
    {"code": "MH-PUN", "name": "Pune", "state": "Maharashtra", "hq": "Pune", "center": [73.8567, 18.5204], "blocks": ["Haveli", "Baramati", "Shirur", "Ambegaon", "Junnar", "Khed", "Maval", "Mulshi", "Velhe", "Bhor", "Purandar", "Indapur", "Daund"]},
    {"code": "MH-AHM", "name": "Ahmednagar", "state": "Maharashtra", "hq": "Ahmednagar", "center": [74.7496, 19.0948], "blocks": ["Nagar", "Rahata", "Sangamner", "Kopargaon", "Shrirampur", "Nevasa", "Shevgaon", "Pathardi", "Parner", "Karjat", "Shrigonda", "Jamkhed"]},
    {"code": "MH-SAT", "name": "Satara", "state": "Maharashtra", "hq": "Satara", "center": [74.0183, 17.6805], "blocks": ["Satara", "Karad", "Wai", "Mahabaleshwar", "Patan", "Phaltan", "Koregaon", "Khatav", "Maan", "Jaoli", "Khandala"]},
    {"code": "MH-SOL", "name": "Solapur", "state": "Maharashtra", "hq": "Solapur", "center": [75.9064, 17.6599], "blocks": ["Solapur North", "Solapur South", "Barshi", "Akkalkot", "Mohol", "Pandharpur", "Madha", "Karmala", "Sangola", "Malshiras", "Mangalwedha"]},
    {"code": "MH-NAS", "name": "Nashik", "state": "Maharashtra", "hq": "Nashik", "center": [73.7898, 19.9975], "blocks": ["Nashik", "Igatpuri", "Dindori", "Peth", "Trimbakeshwar", "Kalwan", "Surgana", "Baglan", "Malegaon", "Chandwad", "Nandgaon", "Yeola", "Niphad", "Sinnar", "Deola"]},
    {"code": "MH-AUR", "name": "Chhatrapati Sambhajinagar", "state": "Maharashtra", "hq": "Sambhajinagar", "center": [75.3433, 19.8762], "blocks": ["Aurangabad", "Paithan", "Gangapur", "Vaijapur", "Kannad", "Khuldabad", "Sillod", "Phulambri", "Soygaon"]},
]

def get_states() -> List[Dict[str, Any]]:
    return INDIAN_STATES

def get_districts(state_code: Optional[str] = "MH") -> List[Dict[str, Any]]:
    if state_code == "MH" or not state_code:
        return MAHARASHTRA_DISTRICTS
    return []

def search_administrative_units(query: str) -> List[Dict[str, Any]]:
    q = query.strip().lower()
    results = []
    
    # Search states
    for s in INDIAN_STATES:
        if q in s["name"].lower() or q == s["code"].lower():
            results.append({
                "type": "State",
                "name": s["name"],
                "code": s["code"],
                "coordinates": s["center"],
                "display_name": f"{s['name']} (State)",
                "source": ADMIN_META["name"],
            })
            
    # Search districts
    for d in MAHARASHTRA_DISTRICTS:
        if q in d["name"].lower() or q in d["code"].lower():
            results.append({
                "type": "District",
                "name": d["name"],
                "code": d["code"],
                "parent": d["state"],
                "coordinates": d["center"],
                "display_name": f"{d['name']} District, {d['state']}",
                "source": ADMIN_META["name"],
            })
        for b in d["blocks"]:
            if q in b.lower():
                results.append({
                    "type": "Block",
                    "name": b,
                    "parent": f"{d['name']}, {d['state']}",
                    "coordinates": [d["center"][0] + 0.05, d["center"][1] + 0.05],
                    "display_name": f"{b} Block, {d['name']}, {d['state']}",
                    "source": ADMIN_META["name"],
                })

    return results
