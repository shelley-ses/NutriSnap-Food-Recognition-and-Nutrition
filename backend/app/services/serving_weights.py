DEFAULT_SERVING_WEIGHTS = {
	"rice": 200.0,
	"adobo": 180.0,
	"chicken adobo": 180.0,
	"pork adobo": 180.0,
	"sinigang": 250.0,
	"soup": 250.0,
	"pancit": 180.0,
	"lumpia": 120.0,
	"lechon": 150.0,
	"tapa": 150.0,
	"beef tapa": 150.0,
	"sisig": 120.0,
	"chicken": 150.0,
	"fish": 150.0,
	"salad": 100.0,
	"vegetable": 100.0,
	"vegetables": 100.0,
	"fruit": 100.0,
	"apple": 120.0,
	"banana": 120.0,
	"bread": 50.0,
	"cake": 120.0,
	"donut": 80.0,
	"pizza": 200.0,
	"sandwich": 150.0,
	"burger": 150.0,
	"pasta": 200.0,
}

def get_baseline_weight(food_label: str) -> float:
	lbl = food_label.lower().strip()
	if lbl in DEFAULT_SERVING_WEIGHTS:
		return DEFAULT_SERVING_WEIGHTS[lbl]
	for key, val in DEFAULT_SERVING_WEIGHTS.items():
		if key in lbl:
			return val
	return 150.0
