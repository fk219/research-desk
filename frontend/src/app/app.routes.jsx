import React from 'react'
import {createBrowserRouter} from 'react-router-dom'
import Protected from '../features/auth/components/Protected'
import { AuthBoot } from '../features/auth/components/AuthShell'

const Dashboard = React.lazy(() => import('../features/chat/pages/Dashboard'))
const Login = React.lazy(() => import('../features/auth/pages/Login'))
const Register = React.lazy(() => import('../features/auth/pages/Register'))
const Settings = React.lazy(() => import('../features/account/pages/Settings'))
const PublicShare = React.lazy(() => import('../features/share/pages/PublicShare'))
const Privacy = React.lazy(() => import('../features/legal/pages/Privacy'))
const Terms = React.lazy(() => import('../features/legal/pages/Terms'))

const load = (node, label) => (
    <React.Suspense fallback={<AuthBoot label={label} />}>
        {node}
    </React.Suspense>
)

const routes = createBrowserRouter([
    {
        path: '/',
        element: <Protected>{load(<Dashboard />, 'Opening your desk')}</Protected>
    },
    {
        path: '/settings',
        element: <Protected>{load(<Settings />, 'Opening account settings')}</Protected>
    },
    {
        path: '/register',
        element: load(<Register />, 'Preparing the desk') 
    },
    {
        path: '/login',
        element: load(<Login />, 'Opening the reading room')
    },
    {
        path: '/share/:shareId',
        element: load(<PublicShare />, 'Opening shared report')
    },
    {
        path: '/privacy',
        element: load(<Privacy />, 'Opening privacy notice')
    },
    {
        path: '/terms',
        element: load(<Terms />, 'Opening terms of use')
    },
]) 

export {routes}
