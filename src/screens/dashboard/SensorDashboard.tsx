import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Droplet, Flame, Gauge, Power } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts'

type SensorsTick = {
	time: string
	humidity1: number
	temperature1: number
	airTemp1: number
	humidity2: number
	temperature2: number
	airTemp2: number
}

type OnLogRow = {
	id: number
	sensor: 1 | 2
	time: string
	humidity: number
	temperature: number
	airTemp: number
	status: 'ON' | 'OFF'
}

const MAX_POINTS = 40
const LOG_LIMIT = 150

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n))
}

function ts() {
	const d = new Date()
	return d.toLocaleTimeString([], { hour12: false })
}

function nextValue(prev: number, delta: number, min: number, max: number) {
	return clamp(prev + (Math.random() * 2 - 1) * delta, min, max)
}

export default function SensorDashboard() {
	// Live time-series for both sensors on a shared timeline
	const [data, setData] = useState<SensorsTick[]>(() => {
		const seed: SensorsTick = {
			time: ts(),
			humidity1: 55,
			temperature1: 24,
			airTemp1: 23,
			humidity2: 48,
			temperature2: 25,
			airTemp2: 22,
		}
		return Array.from({ length: 10 }).map(() => ({
			time: ts(),
			humidity1: clamp(seed.humidity1 + (Math.random() - 0.5) * 6, 30, 80),
			temperature1: clamp(
				seed.temperature1 + (Math.random() - 0.5) * 4,
				10,
				45
			),
			airTemp1: clamp(seed.airTemp1 + (Math.random() - 0.5) * 3, 5, 50),
			humidity2: clamp(seed.humidity2 + (Math.random() - 0.5) * 6, 30, 80),
			temperature2: clamp(
				seed.temperature2 + (Math.random() - 0.5) * 4,
				10,
				45
			),
			airTemp2: clamp(seed.airTemp2 + (Math.random() - 0.5) * 3, 5, 50),
		}))
	})

	// Frontend-controlled statuses (no auto toggling)
	const [status1, setStatus1] = useState<'ON' | 'OFF'>('OFF')
	const [status2, setStatus2] = useState<'ON' | 'OFF'>('OFF')

	// ON status log
	const [onLog, setOnLog] = useState<OnLogRow[]>([])
	const idRef = useRef(1)

	// Global run/pause for auto updates
	const [running, setRunning] = useState(true)

	const current = data[data.length - 1] ?? {
		humidity1: 0,
		temperature1: 0,
		airTemp1: 0,
		humidity2: 0,
		temperature2: 0,
		airTemp2: 0,
	}

	// Simulate sensor updates every 3s
	useEffect(() => {
		if (!running) return
		const interval = setInterval(() => {
			setData(prev => {
				const last = prev[prev.length - 1] ?? prev[0]
				const next: SensorsTick = {
					time: ts(),
					humidity1: nextValue(last?.humidity1 ?? 55, 3.2, 25, 90),
					temperature1: nextValue(last?.temperature1 ?? 24, 1.6, 10, 45),
					airTemp1: nextValue(last?.airTemp1 ?? 23, 1.2, 5, 50),
					humidity2: nextValue(last?.humidity2 ?? 50, 3.0, 25, 90),
					temperature2: nextValue(last?.temperature2 ?? 25, 1.4, 10, 45),
					airTemp2: nextValue(last?.airTemp2 ?? 22, 1.1, 5, 50),
				}

				// While status is ON, log a row for each sensor on every tick
				setOnLog(log => {
					const rows: OnLogRow[] = []
					if (status1 === 'ON') {
						rows.push({
							id: idRef.current++,
							sensor: 1,
							time: next.time,
							humidity: Number(next.humidity1.toFixed(1)),
							temperature: Number(next.temperature1.toFixed(1)),
							airTemp: Number(next.airTemp1.toFixed(1)),
							status: 'ON',
						})
					}
					if (status2 === 'ON') {
						rows.push({
							id: idRef.current++,
							sensor: 2,
							time: next.time,
							humidity: Number(next.humidity2.toFixed(1)),
							temperature: Number(next.temperature2.toFixed(1)),
							airTemp: Number(next.airTemp2.toFixed(1)),
							status: 'ON',
						})
					}
					if (rows.length === 0) return log
					const updated = [...rows, ...log]
					return updated.slice(0, LOG_LIMIT)
				})

				const updated = [...prev, next]
				return updated.slice(-MAX_POINTS)
			})
		}, 3000)
		return () => clearInterval(interval)
	}, [running, status1, status2])

	// Immediate log when toggled to ON for quick feedback
	const logImmediate = (
		sensor: 1 | 2,
		status: 'ON' | 'OFF',
		snapshot: SensorsTick
	) => {
		setOnLog(log => {
			const row: OnLogRow = {
				id: idRef.current++,
				sensor,
				time: snapshot.time,
				humidity: Number(
					(sensor === 1 ? snapshot.humidity1 : snapshot.humidity2).toFixed(1)
				),
				temperature: Number(
					(sensor === 1
						? snapshot.temperature1
						: snapshot.temperature2
					).toFixed(1)
				),
				airTemp: Number(
					(sensor === 1 ? snapshot.airTemp1 : snapshot.airTemp2).toFixed(1)
				),
				status,
			}
			const updated = [row, ...log]
			return updated.slice(0, LOG_LIMIT)
		})
	}

	const toggleStatus = (sensor: 1 | 2) => {
		const nowPoint: SensorsTick = data[data.length - 1] ?? {
			time: ts(),
			humidity1: 0,
			temperature1: 0,
			airTemp1: 0,
			humidity2: 0,
			temperature2: 0,
			airTemp2: 0,
		}

		if (sensor === 1) {
			setStatus1(prev => {
				const next = prev === 'ON' ? 'OFF' : 'ON'
				logImmediate(1, next, { ...nowPoint, time: ts() })
				return next
			})
		} else {
			setStatus2(prev => {
				const next = prev === 'ON' ? 'OFF' : 'ON'
				logImmediate(2, next, { ...nowPoint, time: ts() })
				return next
			})
		}
	}

	// Chart configs (keys map to CSS vars in ChartContainer)
	const humidityTempConfig = useMemo(
		() => ({
			humidity1: { label: 'S1 습도 (%)', color: '#14b8a6' }, // teal-500
			temperature1: { label: 'S1 온도 (°C)', color: '#f59e0b' }, // amber-500
			humidity2: { label: 'S2 습도 (%)', color: '#10b981' }, // emerald-500
			temperature2: { label: 'S2 온도 (°C)', color: '#fb923c' }, // orange-400
		}),
		[]
	)

	const airTempConfig = useMemo(
		() => ({
			airTemp1: { label: 'S1 Air 온도 (°C)', color: '#f43f5e' }, // rose-500
			airTemp2: { label: 'S2 Air 온도 (°C)', color: '#84cc16' }, // lime-500
		}),
		[]
	)

	return (
		<div className='flex mx-auto min-h-svh w-full flex-col bg-white'>
			<header className='border-b'>
				<div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:py-6'>
					<div>
						<h1 className='text-xl font-semibold tracking-tight md:text-2xl'>
							센서 모니터링 대시보드
						</h1>
					</div>{' '}
				</div>
			</header>

			<main className='mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 md:py-8'>
				{/* Sensor summary cards */}
				<section className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
					<Card>
						<CardHeader className='pb-2'>
							<div className='flex items-center justify-between'>
								<CardTitle>Sensor 1</CardTitle>
								<div className='flex items-center gap-2'>
									<span
										className={`inline-block h-2.5 w-2.5 rounded-full  ${
											status1 === 'ON' ? 'bg-emerald-500' : 'bg-zinc-500'
										}`}
										aria-hidden='true'
										title='Status indicator'
									/>
									<Badge
										className='border border-gray-500'
										variant={status1 === 'ON' ? 'default' : 'secondary'}
									>
										{status1}
									</Badge>
									<Button
										size='sm'
										variant={status1 === 'ON' ? 'destructive' : 'outline'}
										onClick={() => toggleStatus(1)}
										className={`${
											status1 === 'ON' ? 'bg-blue-700 text-white' : 'outline'
										} ,'ml-1 border border-gray-400, `}
									>
										<Power className='mr-1 h-4 w-4' />
										{status1 === 'ON' ? 'Turn OFF' : 'Turn ON'}
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className='grid grid-cols-3 gap-3'>
							<div className='rounded-lg border p-3'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>습도</span>
									<Droplet className='h-4 w-4 text-teal-500' />
								</div>
								<div className='mt-2 text-xl font-semibold'>
									{current.humidity1.toFixed(1)}%
								</div>
							</div>
							<div className='rounded-lg border p-3'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>온도</span>
									<Flame className='h-4 w-4 text-amber-500' />
								</div>
								<div className='mt-2 text-xl font-semibold'>
									{current.temperature1.toFixed(1)}°C
								</div>
							</div>
							<div className='rounded-lg border p-3'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										Air Temp
									</span>
									<Gauge className='h-4 w-4 text-rose-500' />
								</div>
								<div className='mt-2 text-xl font-semibold'>
									{current.airTemp1.toFixed(1)}°C
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='pb-2'>
							<div className='flex items-center justify-between'>
								<CardTitle>Sensor 2</CardTitle>
								<div className='flex items-center gap-2'>
									<span
										className={`inline-block h-2.5 w-2.5 rounded-full ${
											status2 === 'ON' ? 'bg-emerald-500' : 'bg-zinc-500'
										}`}
										aria-hidden='true'
										title='Status indicator'
									/>
									<Badge
										className='border border-gray-500'
										variant={status2 === 'ON' ? 'default' : 'secondary'}
									>
										{status2}
									</Badge>
									<Button
										size='sm'
										onClick={() => toggleStatus(2)}
										className={`${
											status2 === 'ON' ? 'bg-blue-700 text-white' : 'outline'
										} ,'ml-1 border border-gray-400, `}
									>
										<Power className='mr-1 h-4 w-4' />
										{status2 === 'ON' ? 'Turn OFF' : 'Turn ON'}
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className='grid grid-cols-3 gap-3'>
							<div className='rounded-lg border p-3'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>습도</span>
									<Droplet className='h-4 w-4 text-emerald-500' />
								</div>
								<div className='mt-2 text-xl font-semibold'>
									{current.humidity2.toFixed(1)}%
								</div>
							</div>
							<div className='rounded-lg border p-3'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>온도</span>
									<Flame className='h-4 w-4 text-orange-400' />
								</div>
								<div className='mt-2 text-xl font-semibold'>
									{current.temperature2.toFixed(1)}°C
								</div>
							</div>
							<div className='rounded-lg border p-3'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										Air Temp
									</span>
									<Gauge className='h-4 w-4 text-lime-500' />
								</div>
								<div className='mt-2 text-xl font-semibold'>
									{current.airTemp2.toFixed(1)}°C
								</div>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* Charts */}
				<section className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
					<Card className='lg:col-span-2'>
						<CardHeader className='pb-0'>
							<CardTitle>습도 & 온도 (S1 + S2)</CardTitle>
						</CardHeader>
						<CardContent className='pt-4'>
							<ChartContainer
								className='h-[320px] w-full'
								config={humidityTempConfig as any}
							>
								<ResponsiveContainer width='100%' height='100%'>
									<LineChart
										data={data}
										margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
									>
										<CartesianGrid strokeDasharray='3 3' vertical={false} />
										<XAxis
											dataKey='time'
											tickMargin={8}
											minTickGap={24}
											label={{
												value: 'Time',
												position: 'insideBottomRight',
												offset: -8,
											}}
										/>
										<YAxis
											tickMargin={8}
											width={46}
											label={{
												value: 'Value',
												angle: -90,
												position: 'insideLeft',
												offset: 10,
											}}
										/>
										<ChartTooltip content={<ChartTooltipContent />} />
										<ChartLegend content={<ChartLegendContent />} />
										{/* Sensor 1 */}
										<Line
											type='monotone'
											dot={false}
											dataKey='humidity1'
											stroke='var(--color-humidity1)'
											strokeWidth={2}
											name='S1 습도 (%)'
										/>
										<Line
											type='monotone'
											dot={false}
											dataKey='temperature1'
											stroke='var(--color-temperature1)'
											strokeWidth={2}
											name='S1 온도 (°C)'
										/>
										{/* Sensor 2 */}
										<Line
											type='monotone'
											dot={false}
											dataKey='humidity2'
											stroke='var(--color-humidity2)'
											strokeWidth={2}
											name='S2 습도 (%)'
										/>
										<Line
											type='monotone'
											dot={false}
											dataKey='temperature2'
											stroke='var(--color-temperature2)'
											strokeWidth={2}
											name='S2 온도 (°C)'
										/>
									</LineChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					<Card className='lg:col-span-1'>
						<CardHeader className='pb-0'>
							<CardTitle>Air Temperature (S1 + S2)</CardTitle>
						</CardHeader>
						<CardContent className='pt-4'>
							<ChartContainer
								className='h-[320px] w-full'
								config={airTempConfig as any}
							>
								<ResponsiveContainer width='100%' height='100%'>
									<LineChart
										data={data}
										margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
									>
										<CartesianGrid strokeDasharray='3 3' vertical={false} />
										<XAxis
											dataKey='time'
											tickMargin={8}
											minTickGap={24}
											label={{
												value: 'Time',
												position: 'insideBottomRight',
												offset: -8,
											}}
										/>
										<YAxis
											tickMargin={8}
											width={46}
											label={{
												value: 'Air Temp (°C)',
												angle: -90,
												position: 'insideLeft',
												offset: 10,
											}}
										/>
										<ChartTooltip content={<ChartTooltipContent />} />
										<ChartLegend content={<ChartLegendContent />} />
										<Line
											type='monotone'
											dot={false}
											dataKey='airTemp1'
											stroke='var(--color-airTemp1)'
											strokeWidth={2}
											name='S1 Air 온도 (°C)'
										/>
										<Line
											type='monotone'
											dot={false}
											dataKey='airTemp2'
											stroke='var(--color-airTemp2)'
											strokeWidth={2}
											name='S2 Air 온도 (°C)'
										/>
									</LineChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				</section>

				{/* ON Status Log Table */}
				<section className='grid grid-cols-1'>
					<Card>
						<CardHeader>
							<CardTitle>습도 | 온도 | ON | OFF 상태 로그</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='w-full overflow-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='w-[80px]'>#</TableHead>
											<TableHead>Sensor</TableHead>
											<TableHead>시간 표시</TableHead>
											<TableHead>습도 (%)</TableHead>
											<TableHead>온도 (°C)</TableHead>
											<TableHead>Air 온도 (°C)</TableHead>
											<TableHead>상태</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{onLog.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={7}
													className='text-center text-sm text-muted-foreground'
												>
													현재 ON 기록이 없습니다. 업데이트를 기다리는
													중입니다...
												</TableCell>
											</TableRow>
										) : (
											onLog.map(row => (
												<TableRow key={row.id}>
													<TableCell className='font-medium'>
														{row.id}
													</TableCell>
													<TableCell>
														{row.sensor === 1 ? 'Sensor 1' : 'Sensor 2'}
													</TableCell>
													<TableCell>{row.time}</TableCell>
													<TableCell>{row.humidity.toFixed(1)}</TableCell>
													<TableCell>{row.temperature.toFixed(1)}</TableCell>
													<TableCell>{row.airTemp.toFixed(1)}</TableCell>
													<TableCell>
														{row.status === 'ON' ? (
															<Badge className='bg-emerald-600 hover:bg-emerald-600'>
																ON
															</Badge>
														) : (
															<Badge variant='secondary'>OFF</Badge>
														)}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				</section>
			</main>
		</div>
	)
}
