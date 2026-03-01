import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface LoginProps {
    onLogin: (id: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
    const [id, setId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (id.trim()) {
            onLogin(id.trim());
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md transition-all duration-700 ease-out opacity-0 translate-y-4" ref={(el) => {
                if (el) {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }
            }}>
                <div className="flex justify-center mb-12">
                    <img src="/logo-compatto.svg" alt="Zirèl Logo" className="h-20 w-auto" />
                </div>

                <div className="apple-card p-10 text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Benvenuto</h1>
                    <p className="text-gray-500 mb-10">Inserisci il tuo Codice Locale per accedere</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                placeholder="Codice Locale (Tenant ID)"
                                className="apple-input text-center uppercase tracking-widest placeholder:tracking-normal placeholder:uppercase-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="apple-button w-full flex items-center justify-center gap-2"
                        >
                            Accedi al tuo Concierge
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Design by Antigravity pour Zirèl
                </p>
            </div>
        </div>
    );
};

export default Login;
