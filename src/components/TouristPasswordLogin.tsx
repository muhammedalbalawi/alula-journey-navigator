import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, LogIn, Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';

interface TouristPasswordLoginProps {
  onLoginSuccess: (userId: string, session: any) => void;
}

interface LoginState {
  identifier: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  method: 'phone' | 'email';
  isSignUp: boolean;
  showPassword: boolean;
  loading: boolean;
}

export function TouristPasswordLogin({ onLoginSuccess }: TouristPasswordLoginProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('email');
  const [loginState, setLoginState] = useState<LoginState>({
    identifier: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    method: 'email',
    isSignUp: false,
    showPassword: false,
    loading: false,
  });

  const { toast } = useToast();

  // Update method when tab changes
  const handleTabChange = (method: 'phone' | 'email') => {
    setActiveTab(method);
    setLoginState(prev => ({ 
      ...prev, 
      method, 
      identifier: '',
      password: '',
      confirmPassword: ''
    }));
  };

  const validateInput = (): boolean => {
    if (!loginState.identifier.trim() || !loginState.password.trim()) {
      toast({
        title: t('missingInfo'),
        description: t('fillAllFields'),
        variant: 'destructive',
      });
      return false;
    }

    if (loginState.isSignUp && !loginState.fullName.trim()) {
      toast({
        title: t('missingInfo'),
        description: t('enterFullNameMsg'),
        variant: 'destructive',
      });
      return false;
    }

    if (loginState.isSignUp && loginState.method === 'phone' && !loginState.identifier.trim()) {
      toast({
        title: t('missingInfo'),
        description: 'Please enter your phone number.',
        variant: 'destructive',
      });
      return false;
    }

    if (loginState.method === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginState.identifier)) {
        toast({
          title: t('invalidEmail'),
          description: t('validEmailMsg'),
          variant: 'destructive',
        });
        return false;
      }
    } else {
      const digits = loginState.identifier.replace(/\D/g, '');
      if (digits.length < 9) {
        toast({
          title: t('invalidPhone'),
          description: t('validPhoneMsg'),
          variant: 'destructive',
        });
        return false;
      }
    }

    if (loginState.isSignUp && loginState.password !== loginState.confirmPassword) {
      toast({
        title: t('passwordsNoMatch'),
        description: t('passwordsMatchMsg'),
        variant: 'destructive',
      });
      return false;
    }

    if (loginState.password.length < 6) {
      toast({
        title: t('passwordTooShort'),
        description: t('passwordLengthMsg'),
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSignIn = async () => {
    if (!validateInput()) return;

    setLoginState(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginState.identifier,
        password: loginState.password,
      });

      if (error) throw error;

      if (data.user && data.session) {
        toast({
          title: t('loginSuccessful'),
          description: t('welcomeTourist'),
        });
        
        onLoginSuccess(data.user.id, data.session);
      }

    } catch (error: any) {
      console.error('Error signing in:', error);
      toast({
        title: t('signInFailed'),
        description: error.message || t('invalidCredentials'),
        variant: 'destructive',
      });
    } finally {
      setLoginState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignUp = async () => {
    if (!validateInput()) return;

    setLoginState(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email: loginState.identifier,
        password: loginState.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            user_type: 'tourist',
            full_name: loginState.fullName.trim(),
            phone_number: loginState.phoneNumber.trim()
          }
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        // Create/update profile immediately after successful signup
        const profileData = {
          id: data.user.id,
          user_type: 'tourist',
          full_name: loginState.fullName.trim(),
          phone_number: loginState.phoneNumber.trim(),
          contact_info: loginState.method === 'phone' ? loginState.identifier : loginState.phoneNumber
        };

        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData);

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't block login for profile errors, just log
          }
        } catch (profileError) {
          console.error('Profile creation failed:', profileError);
        }

        toast({
          title: t('accountCreated'),
          description: t('welcomeTourist'),
        });
        
        onLoginSuccess(data.user.id, data.session);
      } else {
        toast({
          title: t('checkEmail'),
          description: t('confirmEmailMsg'),
        });
        setLoginState(prev => ({ ...prev, isSignUp: false }));
      }

    } catch (error: any) {
      console.error('Error signing up:', error);
      toast({
        title: t('signUpFailed'),
        description: error.message || t('unableToCreate'),
        variant: 'destructive',
      });
    } finally {
      setLoginState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSubmit = () => {
    if (loginState.isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  const toggleAuthMode = () => {
    setLoginState(prev => ({
      ...prev,
      isSignUp: !prev.isSignUp,
      password: '',
      confirmPassword: '',
      fullName: '',
      phoneNumber: ''
    }));
  };

  const togglePasswordVisibility = () => {
    setLoginState(prev => ({ ...prev, showPassword: !prev.showPassword }));
  };

  return (
    <Card className="w-full max-w-md glass-card animate-bounce-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl bg-gradient-to-r from-primary to-heritage-amber bg-clip-text text-transparent">
          {loginState.isSignUp ? t('createTouristAccount') : t('touristLogin')}
        </CardTitle>
        <p className="text-muted-foreground">
          {loginState.isSignUp 
            ? t('joinAlUla')
            : t('welcomeBack')
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Phone</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            {loginState.isSignUp && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('fullName')}</label>
                  <Input
                    type="text"
                    placeholder={t('enterFullName')}
                    value={loginState.fullName}
                    onChange={(e) => setLoginState(prev => ({ ...prev, fullName: e.target.value }))}
                    className="glass-effect"
                    disabled={loginState.loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('phoneNumber')}</label>
                  <CountryCodeSelector
                    phoneNumber={loginState.phoneNumber}
                    onPhoneNumberChange={(phone) => setLoginState(prev => ({ ...prev, phoneNumber: phone }))}
                    disabled={loginState.loading}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('emailAddressField')}</label>
              <Input
                type="email"
                placeholder={t('enterEmail')}
                value={loginState.identifier}
                onChange={(e) => setLoginState(prev => ({ ...prev, identifier: e.target.value }))}
                className="glass-effect"
                disabled={loginState.loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('password')}</label>
              <div className="relative">
                <Input
                  type={loginState.showPassword ? 'text' : 'password'}
                  placeholder={t('enterPassword')}
                  value={loginState.password}
                  onChange={(e) => setLoginState(prev => ({ ...prev, password: e.target.value }))}
                  className="glass-effect pr-10"
                  disabled={loginState.loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={togglePasswordVisibility}
                  disabled={loginState.loading}
                >
                  {loginState.showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {loginState.isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('confirmPassword')}</label>
                <Input
                  type={loginState.showPassword ? 'text' : 'password'}
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={loginState.confirmPassword}
                  onChange={(e) => setLoginState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="glass-effect"
                  disabled={loginState.loading}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="phone" className="space-y-4 mt-4">
            {loginState.isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fullName')}</label>
                <Input
                  type="text"
                  placeholder={t('enterFullName')}
                  value={loginState.fullName}
                  onChange={(e) => setLoginState(prev => ({ ...prev, fullName: e.target.value }))}
                  className="glass-effect"
                  disabled={loginState.loading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('phoneNumber')}</label>
              <CountryCodeSelector
                phoneNumber={loginState.identifier}
                onPhoneNumberChange={(phone) => setLoginState(prev => ({ ...prev, identifier: phone }))}
                disabled={loginState.loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('password')}</label>
              <div className="relative">
                <Input
                  type={loginState.showPassword ? 'text' : 'password'}
                  placeholder={t('enterPassword')}
                  value={loginState.password}
                  onChange={(e) => setLoginState(prev => ({ ...prev, password: e.target.value }))}
                  className="glass-effect pr-10"
                  disabled={loginState.loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={togglePasswordVisibility}
                  disabled={loginState.loading}
                >
                  {loginState.showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {loginState.isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('confirmPassword')}</label>
                <Input
                  type={loginState.showPassword ? 'text' : 'password'}
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={loginState.confirmPassword}
                  onChange={(e) => setLoginState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="glass-effect"
                  disabled={loginState.loading}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={loginState.loading}
          variant="desert"
        >
          {loginState.loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {loginState.isSignUp ? t('creatingAccount') : t('signingIn')}
            </>
          ) : (
            <>
              {loginState.isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('createAccount')}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('signIn')}
                </>
              )}
            </>
          )}
        </Button>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAuthMode}
            disabled={loginState.loading}
            className="text-primary hover:text-primary/80"
          >
            {loginState.isSignUp 
              ? t('alreadyAccount')
              : t('newToAlUla')
            }
          </Button>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <strong>{t('notes')}:</strong> {loginState.isSignUp 
            ? t('emailVerifyNote')
            : t('useEmailPassword')
          }
        </div>
      </CardContent>
    </Card>
  );
}