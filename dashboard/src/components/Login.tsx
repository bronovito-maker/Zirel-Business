import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { login } from '../lib/auth';
import toast from 'react-hot-toast';

interface LoginProps {
    onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedToken = token.trim();
        if (!trimmedToken) return;

        setIsLoading(true);
        try {
            await login({ token: trimmedToken });
            onLogin();
            toast.success('Accesso eseguito!');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message === 'INVALID_FORMAT') {
                toast.error('Token non valido. Inserisci un codice completo.');
            } else if (message === 'AUTH_FAILED') {
                toast.error('Token errato. Verifica il codice e riprova.');
            } else {
                toast.error('Impossibile connettersi. Riprova più tardi.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">


            {/* Pulsanti decorativi Apple-style sfondo */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-zirel-orange/20 rounded-full blur-3xl -mr-48 -mt-48 transition-transform duration-1000 ease-in-out transform hover:scale-110"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-zirel-brand/20 rounded-full blur-3xl -ml-48 -mb-48 transition-transform duration-1000 ease-in-out transform hover:scale-110"></div>

            <div className="w-full max-w-md relative z-10" style={{
                animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: 0,
                animationFillMode: 'forwards'
            }} ref={el => {
                if (el) {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }
            }}>
                <div className="apple-card p-6 md:p-12 text-center mx-4 md:mx-0 shadow-2xl">
                    <div className="flex flex-col items-center justify-center mb-0 gap-0">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 z-10 relative">
                            Benvenuto in
                        </h2>
                        <img src="/zirel_logo_esteso.svg" alt="Zirèl Logo" className="w-full max-w-[360px] md:max-w-[500px] h-auto drop-shadow-sm -mt-10 md:-mt-14 -mb-4 md:-mb-8 relative z-0 pointer-events-none" />
                    </div>

                    <p className="text-gray-500 mb-6 text-sm md:text-base relative z-10">Inserisci il tuo Token per accedere</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="IL TUO API TOKEN"
                                className="apple-input text-center text-lg md:text-xl tracking-widest placeholder:tracking-normal h-14"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="apple-button w-full flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Accedi al tuo Concierge
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8">
                        <a href="https://zirel.org" className="text-blue-500 hover:text-blue-600 underline text-sm font-medium transition-colors">
                            Ti sei smarrito? Torna alla home
                        </a>
                    </div>
                </div>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Design by Antigravity pour Zirèl
                </p>
            </div>
        </div>
    );
};

export default Login;
