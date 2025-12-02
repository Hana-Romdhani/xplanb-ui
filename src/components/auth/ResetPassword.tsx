import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { login, forgotPassword } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/resend';
import { X, Moon, Sun, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import Logo from '../../../assets/logo.png';
import LogoDark from '../../../assets/logodark.png';

interface LoginProps {
    onLogin?: () => void;
}

export default function Login({ onLogin }: LoginProps) {
    const { theme, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            setIsLoading(true);
            await login({ email, password });

            // Mark onboarding as complete to skip it
            localStorage.setItem('xplanb_onboarding', 'true');

            toast.success('Welcome back!');
            onLogin?.();
            navigate('/dashboard', { replace: true });
        } catch (error: any) {
            const status = error?.response?.status;
            const backendMessage = error?.response?.data?.message;
            if (status === 401 || status === 400) {
                toast.error('Incorrect email or password');
            } else {
                toast.error(backendMessage || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error('Please enter your email address');
            return;
        }

        try {
            setForgotLoading(true);
            // Call backend to generate reset token and get reset URL
            const response = await forgotPassword(forgotEmail);

            // Backend returns: { success, message, resetUrl, userName, email }
            if (response?.resetUrl && response?.email) {
                // Send email via Resend from frontend
                try {
                    await sendPasswordResetEmail(response.email, {
                        resetUrl: response.resetUrl,
                        userName: response.userName,
                        expiresIn: '1 hour'
                    });
                    toast.success('Password reset email sent! Please check your inbox.');
                    setShowForgotPassword(false);
                    setForgotEmail('');
                } catch (emailError: any) {
                    console.error('Failed to send email via Resend:', emailError);
                    const errorMsg = emailError?.message || 'Failed to send email. Please try again.';
                    toast.error(errorMsg);
                    // Don't close modal on error, let user try again
                }
            } else {
                // User doesn't exist, but show success message for security
                toast.success(response?.message || 'If an account with that email exists, a password reset link has been sent.');
                setShowForgotPassword(false);
                setForgotEmail('');
            }
        } catch (error: any) {
            console.error('Password reset error:', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Failed to initiate password reset. Please try again.';
            toast.error(errorMsg);
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary px-4 py-8">
                <div className="w-full max-w-md">
                    <div className="bg-card rounded-2xl shadow-2xl p-8 space-y-8 border border-border/50">

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={theme === 'dark' ? LogoDark : Logo} alt="XPlanB logo" className="w-10 h-auto" />
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">XPlanB</p>
                                        <p className="text-sm font-medium text-foreground">Workspace</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleTheme}
                                    className="rounded-full hover:bg-secondary transition-colors"
                                    aria-label="Toggle theme"
                                    title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="w-4 h-4" />
                                    ) : (
                                        <Moon className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
                                <p className="text-sm text-muted-foreground">Enter your credentials to access your workspace</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="rounded-lg h-10 text-sm"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(true)}
                                        className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="rounded-lg h-10 text-sm pr-10"
                                        placeholder="••••••••"
                                        required
                                        aria-describedby="password-help"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full rounded-lg h-10 text-sm font-medium group transition-all duration-200"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    'Signing in...'
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Log In
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/50"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-card text-muted-foreground">Don't have an account?</span>
                            </div>
                        </div>

                        <Link to="/signup" className="w-full">
                            <Button
                                variant="outline"
                                className="w-full rounded-lg h-10 text-sm font-medium transition-colors"
                            >
                                Create account
                            </Button>
                        </Link>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-6">
                        Having trouble? <a href="#" className="text-primary hover:text-primary/80 transition-colors">Contact support</a>
                    </p>
                </div>
            </div>

            {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
                        <div className="p-6 border-b border-border/30 flex items-center justify-between bg-secondary/20">
                            <h2 className="text-lg font-semibold text-foreground">Reset your password</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setShowForgotPassword(false); setForgotEmail(''); }}
                                className="rounded-lg hover:bg-secondary transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
                            <div className="space-y-3">
                                <Label htmlFor="forgot-email" className="text-sm font-medium">Email address</Label>
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="rounded-lg h-10 text-sm"
                                    placeholder="john@example.com"
                                    required
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    We'll send you a secure link to reset your password. Check your inbox within the next few minutes.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowForgotPassword(false); setForgotEmail(''); }}
                                    className="rounded-lg h-10 text-sm font-medium"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-lg h-10 text-sm font-medium group"
                                    disabled={forgotLoading}
                                >
                                    {forgotLoading ? (
                                        'Sending...'
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Send link
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
