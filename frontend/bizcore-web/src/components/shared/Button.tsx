interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   'primary' | 'secondary' | 'danger' | 'ghost';
  size?:      'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = ({
  variant   = 'primary',  // Default to primary style
  size      = 'md',       // Default to medium size
  isLoading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {

  const variantClasses: Record<string, string> = {
    primary: `
      bg-primary-600 text-white
      hover:bg-primary-700
      focus:ring-primary-500
      disabled:bg-primary-300
    `,
    secondary: `
      bg-gray-100 text-gray-700
      hover:bg-gray-200
      focus:ring-gray-400
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus:ring-red-500
    `,
    ghost: `
      bg-transparent text-primary-600
      hover:bg-primary-50
      focus:ring-primary-400
    `,
  };

  const sizeClasses: Record<string, string> = {
    sm:  'px-3 py-1.5 text-xs',
    md:  'px-6 py-2.5 text-sm',
    lg:  'px-8 py-3   text-base',
  };

  return (
    <button
      disabled={disabled || isLoading}
      // Disable button while loading to prevent double-submit
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        // Show spinner when loading
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;