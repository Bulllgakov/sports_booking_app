import { useState, useCallback } from 'react'
import { useSnackbar, VariantType } from 'notistack'
import { handleError, getErrorMessage, AppError, ErrorType } from '../utils/errorHandler'

interface UseErrorReturn {
  error: AppError | null
  isError: boolean
  showError: (error: any) => void
  clearError: () => void
  handleAsync: <T>(promise: Promise<T>) => Promise<T | undefined>
}

export function useError(): UseErrorReturn {
  const [error, setError] = useState<AppError | null>(null)
  const { enqueueSnackbar } = useSnackbar()

  const showError = useCallback((err: any) => {
    const appError = handleError(err)
    setError(appError)
    
    // Определяем тип уведомления
    let variant: VariantType = 'error'
    if (appError.type === ErrorType.VALIDATION) {
      variant = 'warning'
    } else if (appError.type === ErrorType.NETWORK) {
      variant = 'info'
    }
    
    // Показываем snackbar
    enqueueSnackbar(getErrorMessage(appError), {
      variant,
      autoHideDuration: 6000,
      preventDuplicate: true
    })
  }, [enqueueSnackbar])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleAsync = useCallback(async <T,>(promise: Promise<T>): Promise<T | undefined> => {
    try {
      const result = await promise
      clearError()
      return result
    } catch (err) {
      showError(err)
      return undefined
    }
  }, [showError, clearError])

  return {
    error,
    isError: error !== null,
    showError,
    clearError,
    handleAsync
  }
}

// Хук для глобальных ошибок
import { createContext, useContext, ReactNode } from 'react'

interface GlobalErrorContextType {
  showError: (error: any) => void
  clearError: () => void
  error: AppError | null
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined)

export function GlobalErrorProvider({ children }: { children: ReactNode }) {
  const errorHandler = useError()
  
  return (
    <GlobalErrorContext.Provider value={errorHandler}>
      {children}
    </GlobalErrorContext.Provider>
  )
}

export function useGlobalError() {
  const context = useContext(GlobalErrorContext)
  if (!context) {
    throw new Error('useGlobalError must be used within GlobalErrorProvider')
  }
  return context
}