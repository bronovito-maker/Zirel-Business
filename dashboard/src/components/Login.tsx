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
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-zirel-orange/15 rounded-full blur-3xl -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-zirel-blue/15 rounded-full blur-3xl -ml-48 -mb-48"></div>

            <div className="w-full max-w-xl relative z-10 animate-fade-in">
                <div className="apple-card p-7 md:p-10 text-center shadow-2xl">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zirel-blue/5 text-zirel-blue text-[11px] font-bold uppercase tracking-[0.15em] border border-zirel-blue/10">
                        Dashboard Access
                    </span>

                    <div className="mt-6 flex flex-col items-center gap-4">
                        <div
                            aria-label="Zirèl"
                            className="text-[clamp(3rem,8vw,5rem)] font-black leading-none tracking-[-0.04em] select-none"
                        >
                            <span className="text-zirel-orange">Zirèl</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zirel-blue">
                            Accedi al tuo Concierge
                        </h2>
                        <p className="text-gray-500 text-sm md:text-base max-w-md">
                            Inserisci il tuo API token per entrare nel pannello operativo.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 mt-8">
                        <div className="relative">
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Inserisci il tuo API token"
                                className="apple-input text-center md:text-lg h-14"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="apple-button w-full h-14 flex items-center justify-center gap-2 text-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Accedi ora
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-7">
                        <a href="https://zirel.org" className="text-zirel-blue hover:text-zirel-orange-dark underline text-sm font-medium transition-colors">
                            Torna a zirel.org
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
