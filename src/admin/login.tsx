import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
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
    setValue,
    watch,
    control,
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
    mode: "onChange", // Validate on change for better UX
  });

  // Watch form values for debugging
  const watchedValues = watch();
  
  // Load saved user data if "remember me" was checked
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        console.log("Loaded saved user data:", userData);
        if (userData.rememberMe && userData.username) {
          setValue("username", userData.username);
          setValue("rememberMe", true);
          console.log("Applied saved username:", userData.username);
        }
      }
    } catch (error) {
      console.error("Error loading saved user data:", error);
      // Clear invalid data
      localStorage.removeItem("user");
    }
  }, [setValue]);

  // Redirect if already authenticated
  useEffect(() => {
    console.log(`[LOGIN] Auth state changed - isAuthenticated: ${isAuthenticated}, isLoading: ${isLoading}`);
    if (isAuthenticated) {
      console.log('[LOGIN] User is authenticated, navigating to /admin');
      navigate('/admin');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Clear errors when form values change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [watchedValues.username, watchedValues.password, clearError, error]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      // Navigation will be handled by the useEffect above
    } catch (error) {
      // Error handling is managed by the AuthContext
      console.error('Login failed:', error);
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
            安全巡检管理系统
          </h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">管理员登录</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit(onSubmit, handleFormError)}>
            <CardContent className="space-y-4">
              {/* API Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2">
                <Controller
                  name="rememberMe"
                  control={control}
                  render={({ field: { onChange, value, ref, ...fieldProps } }) => (
                    <Checkbox
                      {...fieldProps}
                      id="rememberMe"
                      ref={ref}
                      checked={!!value}
                      onCheckedChange={(checked) => {
                        onChange(checked === true);
                        console.log(`[CHECKBOX DEBUG] Checkbox changed to: ${checked}, typeof: ${typeof checked}`);
                      }}
                      disabled={isLoading}
                    />
                  )}
                />
                <Label 
                  htmlFor="rememberMe" 
                  className="text-sm font-normal cursor-pointer"
                >
                  记住用户名
                </Label>
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
            管理门户 - 需要安全访问
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground mt-2">
              <p>用户名最少3个字符，密码最少6个字符</p>
              <p className="mt-1">
                Debug: RememberMe = {watchedValues.rememberMe ? '✅' : '❌'} | 
                Username = "{watchedValues.username}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}