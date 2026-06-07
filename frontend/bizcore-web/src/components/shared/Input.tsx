type InputProps = {
  label?      : string;
  error?      : string;
  helperText? : string;
} & React.InputHTMLAttributes<HTMLInputElement>;
// ↑ Yeh sab standard HTML input props bhi allow karta hai
//   (type, placeholder, autoComplete, onChange, etc.)

const Input = ({ label, error, helperText, ...rest }: InputProps) => {
  return (
    <div className="flex flex-col gap-1">

      {/* Label */}
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Input */}
      <input
        className={`
          border rounded-lg p-2.5 text-sm outline-none
          transition-colors duration-200
          ${error
            ? 'border-red-400 focus:border-red-500 bg-red-50'
            : 'border-gray-300 focus:border-primary-500'
          }
        `}
        {...rest}
        // ↑ helperText, label, error — teeno yahan nahi jaayenge
        //   kyunki upar destructure kar liye
      />

      {/* Helper Text */}
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

    </div>
  );
};

export default Input;