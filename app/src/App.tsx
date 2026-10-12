import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import HowItWorksPage from './pages/HowItWorksPage'
import SourcesPage from './pages/SourcesPage'
import EducationPage from './pages/EducationPage'
import AboutPage from './pages/AboutPage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="como-funciona" element={<HowItWorksPage />} />
        <Route path="fontes" element={<SourcesPage />} />
        <Route path="educacao-cidada" element={<EducationPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="privacidade" element={<PlaceholderPage kind="privacidade" />} />
        <Route path="termos" element={<PlaceholderPage kind="termos" />} />
        <Route path="contato" element={<PlaceholderPage kind="contato" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
