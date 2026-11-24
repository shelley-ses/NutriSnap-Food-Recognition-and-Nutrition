import { useState } from "react";
import { saveCalorieGoal } from "../../services/api";

export default function OnboardingWizard({ onComplete }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("lose"); // lose, maintain, gain
  const [activityLevel, setActivityLevel] = useState("lightly"); // not_very, lightly, active, very
  const [sex, setSex] = useState("female"); // female, male
  const [birthday, setBirthday] = useState("2005-09-08");

  // Height State
  const [heightUnit, setHeightUnit] = useState("cm"); // cm, ft_in
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  // Weight State
  const [weightUnit, setWeightUnit] = useState("kg"); // kg, lbs
  const [weightVal, setWeightVal] = useState("");

  // Goal Weight State
  const [goalWeightVal, setGoalWeightVal] = useState("");

  // Weekly Goal State
  const [weeklyGoalKg, setWeeklyGoalKg] = useState(0.5); // 0.25, 0.5, 0.75, 1.0

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Dynamic Steps
  const getSteps = () => {
    const steps = [
      { key: "name", title: "What should we call you?" },
      { key: "goal", title: "Your goals" },
      { key: "activity", title: "Baseline Activity" },
      { key: "sex_age", title: "Personal Details" },
      { key: "height", title: "How tall are you?" },
      { key: "weight", title: "How much do you weigh?" },
    ];
    if (goal !== "maintain") {
      steps.push({ key: "goal_weight", title: "What is your goal weight?" });
      steps.push({ key: "weekly_goal", title: "Weekly goal" });
    }
    return steps;
  };

  const steps = getSteps();
  const currentStep = steps[currentStepIndex];

  // Unit conversions
  const getHeightInCm = () => {
    if (heightUnit === "cm") {
      return parseFloat(heightCm) || 0;
    } else {
      const ft = parseFloat(heightFt) || 0;
      const inch = parseFloat(heightIn) || 0;
      return (ft * 12 + inch) * 2.54;
    }
  };

  const getWeightInKg = () => {
    const w = parseFloat(weightVal) || 0;
    if (weightUnit === "kg") {
      return w;
    } else {
      return w / 2.20462;
    }
  };

  const getGoalWeightInKg = () => {
    const gw = parseFloat(goalWeightVal) || 0;
    if (weightUnit === "kg") {
      return gw;
    } else {
      return gw / 2.20462;
    }
  };

  // Navigations & Validations
  const handleNext = () => {
    setError("");

    if (currentStep.key === "name") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
    }

    if (currentStep.key === "sex_age") {
      if (!birthday) {
        setError("Please select your birthday.");
        return;
      }
      const year = parseInt(birthday.split("-")[0]);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        setError("Please enter a valid birthday.");
        return;
      }
    }

    if (currentStep.key === "height") {
      if (heightUnit === "cm") {
        const h = parseFloat(heightCm);
        if (!heightCm || isNaN(h) || h < 30.48 || h > 274.32) {
          setError("Height must be between 30.48 cm (1 ft) and 274.32 cm (9 ft).");
          return;
        }
      } else {
        const ft = parseFloat(heightFt);
        const inch = parseFloat(heightIn) || 0;
        const totalFt = ft + inch / 12;
        if (isNaN(ft) || totalFt < 1.0 || totalFt > 9.0) {
          setError("Height must be between 1 ft and 9 ft.");
          return;
        }
      }
    }

    if (currentStep.key === "weight") {
      const w = parseFloat(weightVal);
      if (!weightVal || isNaN(w)) {
        setError(`Please enter a valid weight in ${weightUnit}.`);
        return;
      }
      if (weightUnit === "kg" && w < 25) {
        setError("Weight must be at least 25 kg.");
        return;
      }
      if (weightUnit === "lbs" && w < 55) {
        setError("Weight must be at least 55 lbs.");
        return;
      }
    }

    if (currentStep.key === "goal_weight") {
      const gw = parseFloat(goalWeightVal);
      if (!goalWeightVal || isNaN(gw)) {
        setError(`Please enter a valid goal weight in ${weightUnit}.`);
        return;
      }
      if (weightUnit === "kg" && gw < 25) {
        setError("Goal weight must be at least 25 kg.");
        return;
      }
      if (weightUnit === "lbs" && gw < 55) {
        setError("Goal weight must be at least 55 lbs.");
        return;
      }

      const w = parseFloat(weightVal);
      if (goal === "lose" && gw >= w) {
        setError("Your goal weight must be less than your actual weight to lose weight.");
        return;
      }
      if (goal === "gain" && gw <= w) {
        setError("Your goal weight must be greater than your actual weight to gain weight.");
        return;
      }
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const height = getHeightInCm();
    const weight = getWeightInKg();
    const goalWeight = goal !== "maintain" ? getGoalWeightInKg() : null;
    const weeklyRate = goal !== "maintain" ? parseFloat(weeklyGoalKg) : null;

    const payload = {
      name: name.trim(),
      goal,
      activity_level: activityLevel,
      sex,
      birthday,
      height_cm: height,
      weight_kg: weight,
      goal_weight_kg: goalWeight,
      weekly_goal_kg: weeklyRate
    };

    try {
      const res = await saveCalorieGoal(payload);
      if (res.ok) {
        if (payload.name) {
          localStorage.setItem("nutrisnap_user_name", payload.name);
        }
        onComplete(res.data);
      } else {
        setError(res.error || "Failed to save goals. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[500px] border border-slate-100 p-8 flex flex-col relative text-[#163f22] font-poppins">

        {/* Progress Bar & Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-bold text-[#6f8a63] mb-2 uppercase tracking-wider select-none">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{currentStep.title}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full bg-[var(--app-color-primary)] transition-all duration-300"
            />
          </div>
        </div>

        {/* Error Notification */}
        {error && error !== "Please enter your name." && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold mb-4 mt-2">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 min-h-[200px] flex flex-col justify-center">

          {/* Step 1: Name */}
          {currentStep.key === "name" && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold text-[#163f22]">What should we call you?</h2>
              <p className="text-xs font-semibold text-[#6f8a63]">Let's personalize your dashboard</p>
              <input
                type="text"
                placeholder="Enter your name or nickname"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setError("");
                }}
                className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold text-sm transition-all ${error === "Please enter your name."
                  ? "border-rose-500 focus:border-rose-500 bg-rose-50/10"
                  : "border-slate-200 focus:border-[var(--app-color-primary)]"
                  }`}
                autoFocus
              />
              {error === "Please enter your name." && (
                <p className="text-xs font-bold text-rose-600 select-none">Please enter your name.</p>
              )}
            </div>
          )}

          {/* Step 2: Goals */}
          {currentStep.key === "goal" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">Your goals</h2>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { value: "lose", label: "Lose weight" },
                  { value: "maintain", label: "Maintain weight" },
                  { value: "gain", label: "Gain weight" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGoal(opt.value)}
                    className={`w-full p-4 rounded-2xl text-left font-bold text-sm transition-all flex items-center justify-between border ${goal === opt.value
                      ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)] shadow-sm"
                      : "bg-white border-slate-200 hover:border-[var(--app-color-primary)]"
                      }`}
                  >
                    <span>{opt.label}</span>
                    {goal === opt.value && (
                      <span className="w-5 h-5 rounded-full bg-[var(--app-color-primary)] flex items-center justify-center text-white text-[10px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Activity */}
          {currentStep.key === "activity" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">Baseline Activity</h2>
              <div className="grid grid-cols-1 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                {[
                  {
                    value: "not_very",
                    label: "Not Very Active",
                    desc: "Spend most of your day sitting (e.g. desk job, driver)"
                  },
                  {
                    value: "lightly",
                    label: "Lightly Active",
                    desc: "Spend some of the day on your feet (e.g. teacher, retail salesperson)"
                  },
                  {
                    value: "active",
                    label: "Active",
                    desc: "Spend a good part of the day doing physical activity (e.g. server, mail carrier)"
                  },
                  {
                    value: "very",
                    label: "Very Active",
                    desc: "Spend most of the day doing heavy physical labor (e.g. construction worker, athlete)"
                  }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActivityLevel(opt.value)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${activityLevel === opt.value
                      ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] shadow-sm"
                      : "bg-white border-slate-200 hover:border-[var(--app-color-primary)]"
                      }`}
                  >
                    <p className={`font-bold text-sm ${activityLevel === opt.value ? 'text-[var(--app-color-primary-dark)]' : 'text-[#163f22]'}`}>{opt.label}</p>
                    <p className="text-[11px] font-semibold text-[#6f8a63] mt-0.5 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Sex & Year Born */}
          {currentStep.key === "sex_age" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">Personal Details</h2>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#6f8a63] uppercase">Sex</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" }
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSex(s.value)}
                      className={`py-3.5 rounded-2xl font-bold text-sm transition-all border ${sex === s.value
                        ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]"
                        : "bg-white border-slate-200 hover:border-[var(--app-color-primary)]"
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#6f8a63] uppercase">Birthday</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[var(--app-color-primary)] outline-none font-semibold text-sm transition-all text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Step 5: Height */}
          {currentStep.key === "height" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">How tall are you?</h2>

              <div className="flex bg-slate-100 rounded-xl p-1 select-none">
                <button
                  type="button"
                  onClick={() => setHeightUnit("cm")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${heightUnit === "cm" ? "bg-white text-[var(--app-color-primary-dark)] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => setHeightUnit("ft_in")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${heightUnit === "ft_in" ? "bg-white text-[var(--app-color-primary-dark)] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  ft / in
                </button>
              </div>

              {heightUnit === "cm" ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="Height in cm"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[var(--app-color-primary)] outline-none font-semibold text-sm transition-all"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Feet</label>
                    <input
                      type="number"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      placeholder="ft"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[var(--app-color-primary)] outline-none font-semibold text-sm transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Inches</label>
                    <input
                      type="number"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      placeholder="in"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[var(--app-color-primary)] outline-none font-semibold text-sm transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Weight */}
          {currentStep.key === "weight" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">How much do you weigh?</h2>

              <div className="flex bg-slate-100 rounded-xl p-1 select-none">
                <button
                  type="button"
                  onClick={() => setWeightUnit("kg")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${weightUnit === "kg" ? "bg-white text-[var(--app-color-primary-dark)] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  kg
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit("lbs")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${weightUnit === "lbs" ? "bg-white text-[var(--app-color-primary-dark)] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  lbs
                </button>
              </div>

              <input
                type="number"
                value={weightVal}
                onChange={(e) => setWeightVal(e.target.value)}
                placeholder={`Weight in ${weightUnit}`}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[var(--app-color-primary)] outline-none font-semibold text-sm transition-all"
                autoFocus
              />
            </div>
          )}

          {/* Step 7: Goal Weight */}
          {currentStep.key === "goal_weight" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">What is your goal weight?</h2>
              <p className="text-xs font-semibold text-[#6f8a63]">
                Your current weight: {weightVal} {weightUnit} ({goal === "lose" ? "Losing" : "Gain"} Goal)
              </p>

              <input
                type="number"
                value={goalWeightVal}
                onChange={(e) => setGoalWeightVal(e.target.value)}
                placeholder={`Goal weight in ${weightUnit}`}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[var(--app-color-primary)] outline-none font-semibold text-sm transition-all"
                autoFocus
              />
            </div>
          )}

          {/* Step 8: Weekly Goal */}
          {currentStep.key === "weekly_goal" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#163f22]">Weekly goal</h2>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { rate: 0.25, label: `${goal === "lose" ? "lose" : "gain"} 0.25 kg per week` },
                  { rate: 0.5, label: `${goal === "lose" ? "lose" : "gain"} 0.5 kg per week`, desc: "(recommended)" },
                  { rate: 0.75, label: `${goal === "lose" ? "lose" : "gain"} 0.75 kg per week` },
                  { rate: 1.0, label: `${goal === "lose" ? "lose" : "gain"} 1 kg per week` }
                ].map((opt) => (
                  <button
                    key={opt.rate}
                    onClick={() => setWeeklyGoalKg(opt.rate)}
                    className={`w-full p-4 rounded-2xl text-left font-bold text-sm transition-all flex items-center justify-between border ${weeklyGoalKg === opt.rate
                      ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)] shadow-sm"
                      : "bg-white border-slate-200 hover:border-[var(--app-color-primary)]"
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{opt.label}</span>
                      {opt.desc && <span className="text-[10px] bg-[var(--app-color-primary)] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">{opt.desc}</span>}
                    </div>
                    {weeklyGoalKg === opt.rate && (
                      <span className="w-5 h-5 rounded-full bg-[var(--app-color-primary)] flex items-center justify-center text-white text-[10px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-6 select-none">
          {currentStepIndex > 0 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-98 transition-all font-bold text-xs cursor-pointer text-slate-500"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] active:scale-98 transition-all font-bold text-xs cursor-pointer shadow-md"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] active:scale-98 transition-all font-bold text-xs cursor-pointer shadow-md flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Complete"
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
