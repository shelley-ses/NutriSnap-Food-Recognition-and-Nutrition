import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMe, getCalorieGoal, saveCalorieGoal, changePassword } from "../services/api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("goals");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Goal Settings Form State
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("lose"); // lose, maintain, gain
  const [activityLevel, setActivityLevel] = useState("lightly"); // not_very, lightly, active, very
  const [sex, setSex] = useState("female"); // female, male
  const [birthday, setBirthday] = useState("1995-01-01");
  
  const [heightUnit, setHeightUnit] = useState("cm"); // cm, ft_in
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  const [weightUnit, setWeightUnit] = useState("kg"); // kg, lbs
  const [weightVal, setWeightVal] = useState("");
  const [goalWeightVal, setGoalWeightVal] = useState("");
  const [weeklyGoalKg, setWeeklyGoalKg] = useState(0.5); // 0.25, 0.5, 0.75, 1.0

  const [goalSaveStatus, setGoalSaveStatus] = useState("idle"); // idle, saving, saved, error
  const [goalError, setGoalError] = useState("");

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [pwSaveStatus, setPwSaveStatus] = useState("idle"); // idle, saving, saved, error
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Load User details and Goal Config
  const loadProfileAndGoals = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [userRes, goalRes] = await Promise.all([
        getMe(),
        getCalorieGoal().catch(() => ({ ok: false }))
      ]);

      if (userRes.ok && userRes.data) {
        setProfile(userRes.data);
        setName(userRes.data.first_name + " " + userRes.data.last_name);
      } else {
        setError(userRes.error || "Failed to load profile details.");
      }

      if (goalRes.ok && goalRes.data) {
        const gd = goalRes.data;
        setGoal(gd.goal || "lose");
        setActivityLevel(gd.activity_level || "lightly");
        setSex(gd.sex || "female");
        setBirthday(gd.birthday || "1995-01-01");
        
        // Height default setup
        setHeightCm(String(Math.round(gd.height_cm || 170)));
        // Weight default setup
        setWeightVal(String(Math.round(gd.weight_kg || 70)));
        setGoalWeightVal(gd.goal_weight_kg ? String(Math.round(gd.goal_weight_kg)) : "");
        setWeeklyGoalKg(gd.weekly_goal_kg || 0.5);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileAndGoals();
  }, []);

  // Conversions
  const getHeightInCm = () => {
    if (heightUnit === "cm") {
      return parseFloat(heightCm) || 0;
    } else {
      const ft = parseFloat(heightFt) || 0;
      const inch = parseFloat(heightIn) || 0;
      return Math.round((ft * 12 + inch) * 2.54);
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

  // Submit Goal Updates
  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setGoalSaveStatus("saving");
    setGoalError("");

    const height = getHeightInCm();
    const weight = getWeightInKg();
    const goalWeight = goal !== "maintain" ? getGoalWeightInKg() : null;
    const weeklyRate = goal !== "maintain" ? parseFloat(weeklyGoalKg) : null;

    if (!weight || weight <= 0) {
      setGoalError("Please enter a valid weight.");
      setGoalSaveStatus("error");
      return;
    }

    if (weightUnit === "kg" && weight < 25) {
      setGoalError("Weight must be at least 25 kg.");
      setGoalSaveStatus("error");
      return;
    }
    if (weightUnit === "lbs" && (parseFloat(weightVal) < 55)) {
      setGoalError("Weight must be at least 55 lbs.");
      setGoalSaveStatus("error");
      return;
    }

    if (goal !== "maintain") {
      if (!goalWeight || goalWeight <= 0) {
        setGoalError("Please enter a valid goal weight.");
        setGoalSaveStatus("error");
        return;
      }
      if (weightUnit === "kg" && goalWeight < 25) {
        setGoalError("Goal weight must be at least 25 kg.");
        setGoalSaveStatus("error");
        return;
      }
      if (weightUnit === "lbs" && (parseFloat(goalWeightVal) < 55)) {
        setGoalError("Goal weight must be at least 55 lbs.");
        setGoalSaveStatus("error");
        return;
      }
    }

    if (height < 30.48 || height > 274.32) {
      setGoalError("Height must be between 30.48 cm (1 ft) and 274.32 cm (9 ft).");
      setGoalSaveStatus("error");
      return;
    }

    if (goal === "lose" && goalWeight >= weight) {
      setGoalError("Goal weight must be less than current weight for weight loss.");
      setGoalSaveStatus("error");
      return;
    }

    if (goal === "gain" && goalWeight <= weight) {
      setGoalError("Goal weight must be greater than current weight to gain weight.");
      setGoalSaveStatus("error");
      return;
    }

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
        setGoalSaveStatus("saved");
        if (payload.name) {
          localStorage.setItem("nutrisnap_user_name", payload.name);
        }
        // Update local storage goals mapping
        const goalData = {
          calories: res.data.daily_calorie_goal,
          carbs: res.data.daily_carbs_goal,
          fat: res.data.daily_fat_goal,
          protein: res.data.daily_protein_goal,
          sodium: res.data.daily_sodium_goal,
          sugar: res.data.daily_sugar_goal
        };
        localStorage.setItem("nutrisnap_daily_goals", JSON.stringify(goalData));
        setTimeout(() => setGoalSaveStatus("idle"), 2500);
      } else {
        setGoalError(res.error || "Failed to update goals.");
        setGoalSaveStatus("error");
      }
    } catch (err) {
      setGoalError(err.message || "An error occurred while saving.");
      setGoalSaveStatus("error");
    }
  };

  // Submit Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwSaveStatus("saving");
    setPwError("");
    setPwSuccess("");

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      setPwSaveStatus("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      setPwSaveStatus("error");
      return;
    }

    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      if (res.ok) {
        setPwSaveStatus("saved");
        setPwSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPwSaveStatus("idle");
          setPwSuccess("");
        }, 3000);
      } else {
        setPwError(res.error || "Failed to change password.");
        setPwSaveStatus("error");
      }
    } catch (err) {
      setPwError(err.message || "An error occurred.");
      setPwSaveStatus("error");
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-[var(--app-color-surface)] min-h-screen app-font-body pb-32 flex flex-col items-center">
        
        {/* Top Header Section */}
        <div className="w-full max-w-[1200px] px-6 md:px-10 pt-8 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-6 select-none">
          <div className="space-y-1">
            <p className="text-[0.7rem] font-black tracking-widest text-[#75b140] uppercase font-poppins">Settings & Customization</p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-[var(--app-color-ink)] font-poppins">Your Profile</h1>
            <p className="text-xs font-semibold text-slate-500">Manage goals, physical metrics, and security settings</p>
          </div>
        </div>

        {isLoading ? (
          <div className="w-full max-w-[1200px] px-6 md:px-10 pt-16 text-center text-sm text-[var(--app-color-muted)]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--app-color-primary)] mx-auto mb-4"></div>
            Loading profile information...
          </div>
        ) : error ? (
          <div className="w-full max-w-[1200px] px-6 md:px-10 pt-8">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[1200px] px-6 md:px-10 flex flex-col items-center pt-2">
            
            {/* Tabs Selector */}
            <div className="w-full max-w-[700px] flex border-b border-slate-200/60 mb-8 select-none">
              <button
                type="button"
                onClick={() => setActiveTab("goals")}
                className={`pb-3.5 text-sm font-extrabold transition-all border-none bg-transparent cursor-pointer relative ${
                  activeTab === "goals"
                    ? "text-[var(--app-color-primary-dark)]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                style={{ marginRight: '32px', outline: 'none' }}
              >
                Target Fitness Goals
                {activeTab === "goals" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-color-primary-dark)] rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`pb-3.5 text-sm font-extrabold transition-all border-none bg-transparent cursor-pointer relative ${
                  activeTab === "password"
                    ? "text-[var(--app-color-primary-dark)]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                style={{ outline: 'none' }}
              >
                Change Password
                {activeTab === "password" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-color-primary-dark)] rounded-full" />
                )}
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === "goals" ? (
              <div className="w-full max-w-[700px] flex flex-col gap-6">
                {/* Profile details summary */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex items-center gap-4 select-none w-full">
                  <div className="h-14 w-14 rounded-full bg-[var(--app-color-surface)] text-[var(--app-color-primary-dark)] font-extrabold flex items-center justify-center shrink-0 text-xl border border-slate-100">
                    {(profile?.first_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{profile?.first_name} {profile?.last_name}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{profile?.email}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col w-full">
                  <h2 className="text-xl font-extrabold text-[#163f22] leading-snug font-poppins mb-1">Target Fitness Goals</h2>
                  <p className="text-xs font-semibold text-slate-400 mb-6">Recalculates your baseline daily BMR & TDEE calorie limits</p>

                {goalError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold mb-4">
                    {goalError}
                  </div>
                )}

                <form onSubmit={handleSaveGoals} className="flex flex-col gap-5">
                  {/* Sex & Birthday Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sex</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["female", "male"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSex(s)}
                            className={`py-2 px-4 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                              sex === s
                                ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]"
                                : "bg-white border-slate-200 text-slate-500 hover:border-[var(--app-color-primary)]"
                            }`}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Birthday</label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700 bg-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Goals Option */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Main Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "lose", label: "Lose Weight" },
                        { value: "maintain", label: "Maintain" },
                        { value: "gain", label: "Gain Weight" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setGoal(opt.value)}
                          className={`py-2.5 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                            goal === opt.value
                              ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]"
                              : "bg-white border-slate-200 text-slate-500 hover:border-[var(--app-color-primary)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Baseline Activity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Activity Level</label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700 bg-white cursor-pointer"
                    >
                      <option value="not_very">Not Very Active (Sedentary Desk Job)</option>
                      <option value="lightly">Lightly Active (Spend some day walking)</option>
                      <option value="active">Active (High physical daily workflow)</option>
                      <option value="very">Very Active (Heavy manual work / athletes)</option>
                    </select>
                  </div>

                  {/* Height Metrics */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Height</label>
                      <div className="flex bg-slate-100 rounded-lg p-0.5 text-[10px] font-bold select-none">
                        <button
                          type="button"
                          onClick={() => setHeightUnit("cm")}
                          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${heightUnit === "cm" ? "bg-white text-[var(--app-color-primary-dark)]" : "text-slate-500"}`}
                        >
                          cm
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeightUnit("ft_in")}
                          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${heightUnit === "ft_in" ? "bg-white text-[var(--app-color-primary-dark)]" : "text-slate-500"}`}
                        >
                          ft/in
                        </button>
                      </div>
                    </div>

                    {heightUnit === "cm" ? (
                      <input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="Height in cm"
                        className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                        required
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={heightFt}
                          onChange={(e) => setHeightFt(e.target.value)}
                          placeholder="ft"
                          className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                          required
                        />
                        <input
                          type="number"
                          value={heightIn}
                          onChange={(e) => setHeightIn(e.target.value)}
                          placeholder="in"
                          className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Weights Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Current Weight */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Weight</label>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 text-[10px] font-bold select-none">
                          <button
                            type="button"
                            onClick={() => setWeightUnit("kg")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${weightUnit === "kg" ? "bg-white text-[var(--app-color-primary-dark)]" : "text-slate-500"}`}
                          >
                            kg
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeightUnit("lbs")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${weightUnit === "lbs" ? "bg-white text-[var(--app-color-primary-dark)]" : "text-slate-500"}`}
                          >
                            lbs
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={weightVal}
                        onChange={(e) => setWeightVal(e.target.value)}
                        placeholder={`Weight in ${weightUnit}`}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                        required
                      />
                    </div>

                    {/* Goal Weight (only displayed if goal is not maintain) */}
                    {goal !== "maintain" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Weight ({weightUnit})</label>
                        <input
                          type="number"
                          value={goalWeightVal}
                          onChange={(e) => setGoalWeightVal(e.target.value)}
                          placeholder={`Goal weight in ${weightUnit}`}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Weekly Target Weight change (only displayed if goal is not maintain) */}
                  {goal !== "maintain" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Target Pace</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[0.25, 0.5, 0.75, 1.0].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setWeeklyGoalKg(rate)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                              weeklyGoalKg === rate
                                ? "bg-[var(--app-color-surface)] border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]"
                                : "bg-white border-slate-200 text-slate-500 hover:border-[var(--app-color-primary)]"
                            }`}
                          >
                            {rate} kg/wk
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    type="submit"
                    disabled={goalSaveStatus === "saving"}
                    className="mt-4 py-3 px-6 rounded-xl bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] transition-all font-bold text-xs shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 border-none"
                  >
                    {goalSaveStatus === "saving" ? "Saving..." : goalSaveStatus === "saved" ? "Goals Saved!" : "Save Goals"}
                  </button>
                </form>
              </div>
            </div>
            ) : (
              <div className="w-full max-w-[500px] flex flex-col gap-6">
                
                {/* Profile details summary */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex items-center gap-4 select-none">
                  <div className="h-14 w-14 rounded-full bg-[var(--app-color-surface)] text-[var(--app-color-primary-dark)] font-extrabold flex items-center justify-center shrink-0 text-xl border border-slate-100">
                    {(profile?.first_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{profile?.first_name} {profile?.last_name}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{profile?.email}</p>
                  </div>
                </div>

                {/* Password update form card */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col">
                  <h2 className="text-xl font-extrabold text-[#163f22] leading-snug font-poppins mb-1">Change Password</h2>
                  <p className="text-xs font-semibold text-slate-400 mb-6">Update your account credentials for security</p>

                  {pwError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold mb-4">
                      {pwError}
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold mb-4">
                      {pwSuccess}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-xs text-slate-700"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pwSaveStatus === "saving"}
                      className="mt-4 py-3 px-6 rounded-xl bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] transition-all font-bold text-xs shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 border-none"
                    >
                      {pwSaveStatus === "saving" ? "Changing..." : pwSaveStatus === "saved" ? "Password Updated!" : "Update Password"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
