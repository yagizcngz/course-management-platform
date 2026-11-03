import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// Singleton AudioContext to prevent "too many contexts" error
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch((e) => {
      void e;
    });
  }
  return audioCtx;
};

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/login" });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isHappy, setIsHappy] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const mousePos = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });

  const isAverted = isPasswordFocused && !passwordVisible;

  // Gözlerin hedefe (fare veya imleç) bakmasını sağlayan fonksiyon
  const updateEyes = () => {
    if (!stageRef.current) return;

    let targetX = mousePos.current.x;
    let targetY = mousePos.current.y;

    if (isUsernameFocused && usernameRef.current) {
      const rect = usernameRef.current.getBoundingClientRect();
      targetX = rect.left + 10 + Math.min(username.length * 8, rect.width - 20);
      targetY = rect.top + rect.height / 2;
    } else if (isPasswordFocused && passwordVisible && passwordRef.current) {
      const rect = passwordRef.current.getBoundingClientRect();
      targetX = rect.left + 10 + Math.min(password.length * 8, rect.width - 20);
      targetY = rect.top + rect.height / 2;
    }

    const chars = stageRef.current.querySelectorAll(".char");
    chars.forEach((char) => {
      const eyes = char.querySelectorAll(".eye");
      eyes.forEach((eye) => {
        const pupil = eye.querySelector(".pupil") as HTMLElement;
        const target = pupil || (eye as HTMLElement);

        // Şifre alanındaysa gözleri kapatmak yerine sadece sola baksın
        if (isAverted) {
          if (pupil) {
            target.style.transform = `translate(calc(-50% - 6px), -50%)`;
          }
          return;
        }

        if (isHappy) {
          if (pupil) target.style.transform = `translate(-50%, -50%)`;
          return;
        }

        const rect = eye.getBoundingClientRect();
        const eyeCX = rect.left + rect.width / 2;
        const eyeCY = rect.top + rect.height / 2;
        const dx = targetX - eyeCX;
        const dy = targetY - eyeCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxMove = 5;
        const px = dist > 0 ? (dx / dist) * Math.min(maxMove, dist * 0.1) : 0;
        const py = dist > 0 ? (dy / dist) * Math.min(maxMove, dist * 0.1) : 0;

        if (pupil) {
          target.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
        }
      });
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      updateEyes();
    };

    document.addEventListener("mousemove", handleMouseMove);
    updateEyes();

    return () => document.removeEventListener("mousemove", handleMouseMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAverted,
    isUsernameFocused,
    isPasswordFocused,
    passwordVisible,
    username.length,
    password.length,
    isHappy,
  ]);

  const playDong = () => {
    try {
      const ctx = getAudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start();
      o.stop(ctx.currentTime + 0.5);
    } catch (e) {
      void e;
    }
  };

  const playError = () => {
    try {
      const ctx = getAudioContext();
      [0, 0.15].forEach((t, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "square";
        o.frequency.value = 200 - i * 40;
        g.gain.setValueAtTime(0.05, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.13);
      });
    } catch (e) {
      void e;
    }
  };

  const playSuccess = () => {
    try {
      const ctx = getAudioContext();
      [523, 659, 784].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.1 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
        o.start(ctx.currentTime + i * 0.1);
        o.stop(ctx.currentTime + i * 0.1 + 0.31);
      });
    } catch (e) {
      void e;
    }
  };

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    [200, 320, 420, 540].forEach((delay) => {
      timeouts.push(setTimeout(() => playDong(), delay));
    });
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("username", username);

        setIsHappy(true);
        playSuccess();

        setTimeout(() => {
          navigate({ to: "/dashboard" });
        }, 800);
      } else {
        triggerError(t("login.invalidCredentials"));
      }
    } catch (err) {
      triggerError(t("login.serverError"));
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    playError();
    setTimeout(() => setIsShaking(false), 500);
  };

  const typingOffset = isUsernameFocused ? Math.min(username.length, 25) : 0;
  const pwdOffset = isAverted ? Math.min(password.length, 25) : 0;

  return (
    <>
      <style>{`
        .login-wrapper {
          min-height: 100vh;
          background-color: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          position: fixed;
          inset: 0;
          z-index: 100;
        }
        .dark .login-wrapper {
          background-color: #09090b;
        }

        .login-card {
          display: flex;
          width: 100%;
          max-width: 900px;
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          min-height: 600px;
        }
        .dark .login-card {
          background: #18181b;
          border: 1px solid #27272a;
        }

        .characters-panel {
          flex: 1;
          background-color: #e8e8ea;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .dark .characters-panel {
          background-color: #27272a;
        }

        @media (max-width: 768px) {
          .characters-panel {
            display: none;
          }
        }

        .stage {
          position: relative;
          width: 260px;
          height: 260px;
          display: flex;
          align-items: flex-end;
        }

        .char {
          position: absolute;
          bottom: 0;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
          transform-origin: bottom center;
        }

        @keyframes dropIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .animate-drop-1 { animation: dropIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-drop-2 { animation: dropIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards; }
        .animate-drop-3 { animation: dropIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards; }
        .animate-drop-4 { animation: dropIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards; }

        #char1 { width: 90px; height: 200px; background-color: #5e2bff; left: 30px; z-index: 1; }
        #char2 { width: 55px; height: 130px; background-color: #1a1a1c; left: 100px; z-index: 2; }
        #char4 { width: 60px; height: 105px; background-color: #fec601; border-radius: 30px 30px 0 0; left: 140px; z-index: 3; }
        #char3 { width: 170px; height: 85px; background-color: #ff6b35; border-radius: 85px 85px 0 0; left: -20px; z-index: 4; }

        .eyes { position: absolute; display: flex; }
        
        .eye { 
          transition: all 0.2s ease-out; 
          background: white; 
          overflow: hidden; 
          position: relative;
        }
        
        .pupil { 
          transition: transform 0.1s ease-out; 
          background: #1a1a1c; 
          border-radius: 50%; 
          position: absolute; 
          top: 50%; left: 50%; 
          transform: translate(-50%, -50%); 
        }

        #char1 .eyes { top: 35px; left: 15px; gap: 14px; }
        #char1 .eye { width: 12px; height: 12px; border-radius: 50%; }
        #char1 .pupil { width: 5px; height: 5px; }
        #char1 .mouth { position: absolute; top: 60px; left: 28px; width: 12px; height: 5px; background: #1a1a1c; border-radius: 0 0 10px 10px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }

        #char2 .eyes { top: 25px; left: 12px; gap: 8px; }
        #char2 .eye { width: 14px; height: 14px; border-radius: 50%; }
        #char2 .pupil { width: 6px; height: 6px; }

        #char4 .eyes { top: 30px; left: 20px; gap: 8px; }
        #char4 .eye { width: 12px; height: 12px; border-radius: 50%; }
        #char4 .pupil { width: 5px; height: 5px; }
        #char4 .mouth { position: absolute; top: 45px; left: 35px; width: 16px; height: 3px; background: #1a1a1c; border-radius: 2px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }

        #char3 .eyes { top: 45px; left: 40px; gap: 12px; }
        #char3 .eye { width: 14px; height: 14px; border-radius: 50%; }
        #char3 .pupil { width: 6px; height: 6px; }
        #char3 .mouth { position: absolute; top: 60px; left: 52px; width: 14px; height: 7px; background: #1a1a1c; border-radius: 0 0 14px 14px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }

        /* Hata durumunda sahneyi salla */
        .shaking-stage { animation: shake 0.4s ease-in-out; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }

        /* ================================
           KULLANICI ADI YAZARKEN DİNAMİK HAREKET
           ================================ */
        .stage.focused-username #char1 { transform: translateX(calc(12px + var(--typing-offset) * 1px)) rotate(calc(5deg + var(--typing-offset) * 0.2deg)) scaleY(1.02); }
        .stage.focused-username #char2 { transform: translateX(calc(18px + var(--typing-offset) * 1px)) rotate(calc(7deg + var(--typing-offset) * 0.2deg)); }
        .stage.focused-username #char3 { transform: translateX(calc(5px + var(--typing-offset) * 0.5px)) rotate(calc(2deg + var(--typing-offset) * 0.1deg)); }
        .stage.focused-username #char4 { transform: translateX(calc(20px + var(--typing-offset) * 1.5px)) rotate(calc(10deg + var(--typing-offset) * 0.3deg)); }
        
        .stage.focused-username #char1 .mouth { height: 8px; border-radius: 5px; width: 8px; left: 30px; } 
        .stage.focused-username #char3 .mouth { height: 10px; border-radius: 0 0 14px 14px; } 
        .stage.focused-username #char4 .mouth { height: 6px; top: 43px; border-radius: 5px; width: 6px; left: 40px; } 

        /* ================================
           ŞİFRE GİRERKEN DİNAMİK KAFALARINI ÇEVİRME
           Gözleri kapamazlar, sadece kafalarını uzaklaştırırlar
           ================================ */
        .stage.avert #char1 { transform: translateX(calc(-15px - var(--pwd-offset) * 1px)) rotate(calc(-10deg - var(--pwd-offset) * 0.2deg)); }
        .stage.avert #char2 { transform: translateX(calc(-10px - var(--pwd-offset) * 0.5px)) translateY(10px) rotate(calc(-8deg - var(--pwd-offset) * 0.2deg)); } 
        .stage.avert #char3 { transform: translateX(calc(-5px - var(--pwd-offset) * 0.5px)) rotate(calc(-4deg - var(--pwd-offset) * 0.1deg)); }
        .stage.avert #char4 { transform: translateX(calc(10px + var(--pwd-offset) * 1px)) rotate(calc(12deg + var(--pwd-offset) * 0.5deg)); }

        .stage.avert #char1 .mouth { height: 2px; border-radius: 2px; width: 10px; }
        .stage.avert #char3 .mouth { height: 2px; border-radius: 2px; width: 10px; }
        .stage.avert #char4 .mouth { height: 2px; border-radius: 2px; width: 10px; }

        /* ================================
           BAŞARILI GİRİŞ DURUMU
           ================================ */
        .happy-stage { animation: bounce 0.5s ease-in-out; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        .happy-stage .eye {
          background: transparent !important;
          border: none;
          border-top: 3px solid #1a1a1c;
          border-radius: 50% 50% 0 0 !important;
          height: 6px !important;
          margin-top: 4px;
        }
        .happy-stage .pupil { display: none; }
        .happy-stage .mouth {
          height: 12px !important; 
          border-radius: 0 0 12px 12px !important;
        }

      `}</style>

      <div
        className="login-wrapper"
        style={
          { "--typing-offset": typingOffset, "--pwd-offset": pwdOffset } as React.CSSProperties
        }
      >
        <div className="login-card animate-in fade-in zoom-in-95 duration-300">
          <div className="characters-panel">
            <div
              className={`stage ${isAverted ? "avert" : ""} ${isUsernameFocused && !isAverted ? "focused-username" : ""} ${isShaking ? "shaking-stage" : ""} ${isHappy ? "happy-stage" : ""}`}
              ref={stageRef}
            >
              <div className="char animate-drop-1" id="char1">
                <div className="eyes">
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                </div>
                <div className="mouth"></div>
              </div>
              <div className="char animate-drop-2" id="char2">
                <div className="eyes">
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                </div>
              </div>
              <div className="char animate-drop-3" id="char4">
                <div className="eyes">
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                </div>
                <div className="mouth"></div>
              </div>
              <div className="char animate-drop-4" id="char3">
                <div className="eyes">
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                  <div className="eye">
                    <div className="pupil"></div>
                  </div>
                </div>
                <div className="mouth"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-zinc-900 p-8 md:p-14 flex flex-col justify-center">
            <div className="max-w-sm w-full mx-auto mt-6">
              <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
                {t("login.welcome")}
              </h1>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-10">
                {t("login.pleaseEnterDetails")}
              </p>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 text-sm p-3 rounded-md mb-6 text-center font-medium animate-pulse">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {t("login.usernameOrEmail")}
                  </label>
                  <input
                    ref={usernameRef}
                    type="text"
                    required
                    className="w-full border-b-2 border-gray-200 dark:border-gray-700 py-2 outline-none focus:border-black dark:focus:border-white transition-colors bg-transparent text-gray-900 dark:text-white text-sm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setIsUsernameFocused(true)}
                    onBlur={() => setIsUsernameFocused(false)}
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {t("login.password")}
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      type={passwordVisible ? "text" : "password"}
                      required
                      className="w-full border-b-2 border-gray-200 dark:border-gray-700 py-2 outline-none focus:border-black dark:focus:border-white transition-colors bg-transparent text-gray-900 dark:text-white pr-10 text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors p-1"
                      title={passwordVisible ? t("login.hidePassword") : t("login.showPassword")}
                    >
                      {passwordVisible ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2 rounded border-gray-300 text-black focus:ring-black"
                    />
                    {t("login.rememberMe")}
                  </label>
                  <a
                    href="#"
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {t("login.forgotPassword")}
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-md font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg hover:shadow-xl mt-4"
                >
                  {t("login.loginButton")}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("login.noAccount")}{" "}
                  <Link
                    to="/register"
                    className="text-black dark:text-white font-semibold hover:underline"
                  >
                    {t("login.registerNow")}
                  </Link>
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs font-medium text-gray-400 dark:text-gray-500">
                  <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">
                    {t("login.returnHome")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
