import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Screens from './screens'

const App = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/dashboard' element={<Screens />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
