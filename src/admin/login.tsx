import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { LoginSchema } from '../types/schemas';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";

// Define the form data type from the schema
type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, isLoading, clearError, isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setFocus,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onChange", // Validate on change for better UX
  });

  // Watch form values for debugging
  const watchedValues = watch();

  // Redirect if already authenticated
  useEffect(() => {
    document.title = '系统登录 - 都豪鼎盛内部系统';
    console.log(`[LOGIN] Auth state changed - isAuthenticated: ${isAuthenticated}, isLoading: ${isLoading}`);
    if (isAuthenticated) {
      console.log('[LOGIN] User is authenticated, navigating to /admin');
      navigate('/admin');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Track if user is actively modifying form
  const prevValues = useRef({ username: '', password: '' });

  // Clear errors only when user actively changes input (not on initial load or state updates)
  useEffect(() => {
    const usernameChanged = prevValues.current.username !== watchedValues.username;
    const passwordChanged = prevValues.current.password !== watchedValues.password;

    if (error && (usernameChanged || passwordChanged)) {
      clearError();
    }

    // Update previous values
    prevValues.current = {
      username: watchedValues.username,
      password: watchedValues.password
    };
  }, [watchedValues.username, watchedValues.password, clearError, error]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      // Navigation will be handled by the useEffect above
    } catch (error) {
      // Error handling is managed by the AuthContext
      if (process.env.NODE_ENV === 'development') {
        console.error('[LOGIN] Login failed:', error);
      }
    }
  };

  const handleFormError = () => {
    // Focus on the first field with an error
    if (errors.username) {
      setFocus("username");
    } else if (errors.password) {
      setFocus("password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">
            都豪鼎盛内部系统
          </h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">系统登录</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit(onSubmit, handleFormError)}>
            <CardContent className="space-y-4">
              {/* API Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs mt-1 opacity-70">
                        Debug: Error state active
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground">
                  Debug State: error={error ? `"${error}"` : 'null'}, isLoading={isLoading.toString()}
                </div>
              )}
              
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  disabled={isLoading}
                  {...register("username")}
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>
              
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  disabled={isLoading}
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

            </CardContent>
            
            <CardFooter className="pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            都豪鼎盛内部系统
          </p>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                京ICP备11028431号-3
              </a>
            </p>
            <p>
              <a
                href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502058970"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                京公网安备11010502058970号
              </a>
            </p>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground mt-2">
              <p>用户名最少3个字符，密码最少6个字符</p>
              <p className="mt-1">
                Debug: Username = "{watchedValues.username}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}