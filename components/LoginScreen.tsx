import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Chrome } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { signIn, isLoading } = useTaskContext();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
      
      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            DevFocus
          </h1>
          <p className="text-slate-400 text-sm">
            Your tasks, synced everywhere
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm">
              Sign in with Google to access your tasks
            </p>
          </div>

          <button
            onClick={signIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>
                <Chrome size={20} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 text-center mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Real-time sync
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Works offline
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Secure & private
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
