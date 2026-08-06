import { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, Activity } from 'lucide-react';

const TIMEOUT_MINUTES = 5;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
const WARNING_MS = (TIMEOUT_MINUTES - 0.5) * 60 * 1000; // 30 seconds before timeout

export default function SessionTimeout({ logout }) {
  const [_showWarning, _setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(30);
  
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActiveRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (_showWarning) {
      _setShowWarning(false);
      setRemainingTime(30);
    }
  }, [_showWarning]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      // Only reset timer silently if we are not already in the warning state
      if (!_showWarning) {
        lastActiveRef.current = Date.now();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Check inactivity periodically
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const inactiveDuration = now - lastActiveRef.current;

      if (inactiveDuration >= TIMEOUT_MS) {
        // Time's up, auto logout
        logout();
      } else if (inactiveDuration >= WARNING_MS && !_showWarning) {
        // Show warning
        _setShowWarning(true);
      }
    }, 1000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [_showWarning, logout]);

  // Handle countdown when warning is shown
  useEffect(() => {
    if (_showWarning) {
      countdownRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [_showWarning]);

  if (!_showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-800 mb-2">Are you still there?</h2>
          <p className="text-slate-600 mb-6">
            For your security, you will be automatically logged out in 
            <span className="font-bold text-rose-600 ml-1">{remainingTime} seconds</span> due to inactivity.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => logout()}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> Logout
            </button>
            <button
              onClick={resetTimer}
              className="flex-1 px-4 py-2.5 rounded-xl bg-academic-blue text-white font-semibold hover:bg-academic-blue/90 transition-colors"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
