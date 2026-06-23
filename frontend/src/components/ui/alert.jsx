import React from 'react'

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const baseClasses = "relative w-full rounded-lg border p-4"
  
  const variants = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
  }
  
  const alertClasses = `${baseClasses} ${variants[variant]} ${className || ''}`
  
  return (
    <div
      ref={ref}
      role="alert"
      className={alertClasses}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className || ''}`}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }