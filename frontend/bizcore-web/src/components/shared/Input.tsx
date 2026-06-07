import React from 'react';

type InputProps = {
  label?      : string;
  error?      : string;
  helperText? : string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({ label, error, helperText, ...rest }: InputProps) => {
  return (
    <div className="flex flex-col gap-1">

      {label && (
        <label className="text-sm font-medium
          text-gray-700 dark:text-slate-400">
          {label}
        </label>
      )}

      <input
        className={`
          border rounded-lg p-2.5 text-sm outline-none
          transition-colors duration-200
          bg-white dark:bg-slate-800/50
          text-gray-900 dark:text-slate-100
          placeholder:text-gray-400 dark:placeholder:text-slate-500
          ${error
            ? 'border-red-400 focus:border-red-500 bg-red-50 dark:bg-red-900/10 dark:border-red-500/50'
            : 'border-gray-300 focus:border-primary-500 dark:border-slate-600 dark:focus:border-primary-500'
          }
        `}
        {...rest}
      />

      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
          {helperText}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;