import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { login } from '../lib/auth';
import { getCurrentTenantId } from '../lib/auth';
import toast from 'react-hot-toast';

interface LoginProps {
    onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [isTokenVisible, setIsTokenVisible] = useState(false);
    const formRef = useRef<HTMLFormElement | null>(null);
    const credentialUsername = useMemo(() => `dashboard@${window.location.host}`, []);
    const signupContext = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('signup') !== 'ok') return null;

        return {
            email: String(params.get('email') || '').trim().toLowerCase(),
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedToken = token.trim();
        if (!trimmedToken) return;

        setIsLoading(true);
        try {
            await login({
                token: trimmedToken,
                persistence: rememberMe ? 'persistent' : 'session',
            });

            const currentTenantId = getCurrentTenantId();

            if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials?.store) {
                try {
                    const PasswordCredentialCtor = (window as Window & {
                        PasswordCredential?: new (data: { id: string; name?: string; password: string }) => Credential;
                    }).PasswordCredential;

                    if (PasswordCredentialCtor) {
                        const credential = new PasswordCredentialCtor({
                            id: currentTenantId || credentialUsername,
                            name: currentTenantId || credentialUsername,
                            password: trimmedToken,
                        });
                        void navigator.credentials.store(credential);
                    }
                } catch {
                    // Ignore unsupported password manager APIs and rely on browser autocomplete metadata.
                }
            }

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
                        Secure Access
                    </span>

                    <div className="mt-6 flex flex-col items-center gap-4">
                        <div
                            aria-label="Zirèl"
                            className="text-[clamp(3rem,8vw,5rem)] font-black leading-none tracking-[-0.04em] select-none"
                        >
                            <span className="text-zirel-orange">Zirèl</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zirel-blue">
                            Accedi al pannello protetto
                        </h2>
                        <p className="text-gray-500 text-sm md:text-base max-w-md">
                            Usa il tuo token di accesso per entrare nel workspace operativo di Zirèl in modo rapido e sicuro.
                        </p>
                    </div>

                    {signupContext ? (
                        <div className="mt-6 rounded-[1.6rem] border border-orange-200 bg-orange-50 px-5 py-4 text-left">
                            <p className="text-sm font-black uppercase tracking-[0.15em] text-zirel-orange-dark">Registrazione inviata</p>
                            <p className="mt-2 text-sm leading-6 text-zirel-blue">
                                Il tenant è stato creato correttamente.
                                {signupContext.email ? ` Il token completo viene inviato a ${signupContext.email}.` : ' Il token completo viene inviato via email.'}
                            </p>
                        </div>
                    ) : null}

                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 mt-8" autoComplete="on">
                        <input type="text" name="username" autoComplete="username" value={credentialUsername} readOnly className="hidden" tabIndex={-1} />
                        <div className="relative">
                            <input
                                type={isTokenVisible ? 'text' : 'password'}
                                name="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Inserisci il token di accesso"
                                autoComplete="current-password"
                                spellCheck={false}
                                className="apple-input h-14 pr-14 text-center md:text-lg"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setIsTokenVisible((current) => !current)}
                                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label={isTokenVisible ? 'Nascondi token' : 'Mostra token'}
                            >
                                {isTokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        <label className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-zirel-orange-dark focus:ring-zirel-orange-dark"
                            />
                            Mantieni l’accesso su questo dispositivo
                        </label>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="apple-button w-full h-14 flex items-center justify-center gap-2 text-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entra nel workspace
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-7">
                        <p className="mb-3 text-xs text-gray-400">
                            Il token può essere salvato dal browser o dal password manager per un accesso più rapido.
                        </p>
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
