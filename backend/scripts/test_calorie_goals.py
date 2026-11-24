import sys
import os
from pathlib import Path

# Add backend to python path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.schemas.calorie_goal import CalorieGoalCreate
from app.routes.calorie_goal import calculate_goals

def test_calculation():
    print("Testing calorie goal calculations...")

    # Case 1: Male, lose weight
    payload1 = CalorieGoalCreate(
        name="John",
        goal="lose",
        activity_level="active",
        sex="male",
        birthday="1990-01-01",
        height_cm=180.0,
        weight_kg=90.0,
        goal_weight_kg=80.0,
        weekly_goal_kg=0.5
    )
    res1 = calculate_goals(payload1)
    print("Male, Lose weight:")
    print(res1)
    
    # BMR = 10 * 90 + 6.25 * 180 - 5 * 36 + 5 = 900 + 1125 - 180 + 5 = 1850
    # TDEE = 1850 * 1.55 = 2867.5
    # Deficit = 0.5 * 7700 / 7 = 550
    # Calories = 2867.5 - 550 = 2317.5 ~= 2318
    # Carbs = 2318 * 0.50 / 4 = 290
    # Protein = 2318 * 0.20 / 4 = 116
    # Fat = 2318 * 0.30 / 9 = 77
    assert res1["daily_calorie_goal"] == 2318
    assert res1["daily_carbs_goal"] == 290
    assert res1["daily_protein_goal"] == 116
    assert res1["daily_fat_goal"] == 77
    print("Case 1 passed!")

    # Case 2: Female, maintain weight
    payload2 = CalorieGoalCreate(
        name="Jane",
        goal="maintain",
        activity_level="not_very",
        sex="female",
        birthday="1996-05-15",
        height_cm=165.0,
        weight_kg=60.0,
        goal_weight_kg=None,
        weekly_goal_kg=None
    )
    res2 = calculate_goals(payload2)
    print("\nFemale, Maintain weight:")
    print(res2)
    
    # BMR = 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    # TDEE = 1320.25 * 1.2 = 1584.3 ~= 1584
    # Carbs = 1584 * 0.50 / 4 = 198
    # Protein = 1584 * 0.20 / 4 = 79
    # Fat = 1584 * 0.30 / 9 = 53
    assert res2["daily_calorie_goal"] == 1584
    assert res2["daily_carbs_goal"] == 198
    assert res2["daily_protein_goal"] == 79
    assert res2["daily_fat_goal"] == 53
    print("Case 2 passed!")

    print("\nAll calculations verified successfully!")

if __name__ == "__main__":
    test_calculation()
