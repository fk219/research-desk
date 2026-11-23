import React, {useEffect} from 'react'
import { RouterProvider } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { routes } from './app.routes'
import {useAuth} from '../features/auth/hook/useAuth'


const App = () => {
  const {handleGetMe} = useAuth()

  useEffect(() => {
    handleGetMe()
  }, [handleGetMe])
  
  return (
    <>
      <RouterProvider router={routes}/>
      <Analytics />
    </>
  )
}

export default App
