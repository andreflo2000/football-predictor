'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { Prediction } from '@/lib/api'

Chart.register(...registerables)

interface Props {
  prediction: Prediction
}

export default function ProbabilityChart({ prediction }: Props) {
  const radarRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const radarChart = useRef<Chart | null>(null)
  const barChart = useRef<Chart | null>(null)

  useEffect(() => {
    if (!radarRef.current) return
    radarChart.current?.destroy()

    const { home_team, away_team, team_stats } = prediction
    const h = team_stats.home
    const a = team_stats.away

    radarChart.current = new Chart(radarRef.current, {
      type: 'radar',
      data: {
        labels: ['xG For', 'xG Against\n(inv)', 'Form', 'Elo\n(norm)', 'Goals Avg'],
        datasets: [
          {
            label: home_team,
            data: [
              Math.min(h.xg_for / 3 * 100, 100),
              Math.max(100 - h.xg_against / 3 * 100, 0),
              h.form_score,
              Math.min((h.elo - 1300) / 700 * 100, 100),
              Math.min(h.xg_for / 3 * 100, 100),
            ],
            backgroundColor: 'rgba(0, 255, 106, 0.15)',
            borderColor: '#00ff6a',
            borderWidth: 2,
            pointBackgroundColor: '#00ff6a',
            pointRadius: 4,
          },
          {
            label: away_team,
            data: [
              Math.min(a.xg_for / 3 * 100, 100),
              Math.max(100 - a.xg_against / 3 * 100, 0),
              a.form_score,
              Math.min((a.elo - 1300) / 700 * 100, 100),
              Math.min(a.xg_for / 3 * 100, 100),
            ],
            backgroundColor: 'rgba(96, 165, 250, 0.10)',
            borderColor: '#60a5fa',
            borderWidth: 2,
            pointBackgroundColor: '#60a5fa',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: '#4a6b50', font: { family: 'JetBrains Mono', size: 11 } }
          }
        },
        scales: {
          r: {
            min: 0, max: 100,
            backgroundColor: 'transparent',
            grid: { color: 'rgba(26, 61, 34, 0.5)' },
            angleLines: { color: 'rgba(26, 61, 34, 0.5)' },
            ticks: {
              color: '#1a3d22', font: { size: 9 },
              backdropColor: 'transparent',
              stepSize: 25,
            },
            pointLabels: { color: '#4a6b50', font: { size: 10 } }
          }
        }
      }
    })

    return () => radarChart.current?.destroy()
  }, [prediction])

  useEffect(() => {
    if (!barRef.current) return
    barChart.current?.destroy()

    const { prediction: pred } = prediction
    const breakdown = prediction.model_breakdown

    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: ['1 (Gazdă)', 'X (Egal)', '2 (Oaspete)'],
        datasets: [
          {
            label: 'Final',
            data: [pred.home_win, pred.draw, pred.away_win],
            backgroundColor: ['rgba(0,255,106,0.7)', 'rgba(96,165,250,0.7)', 'rgba(248,113,113,0.4)'],
            borderColor: ['#00ff6a', '#60a5fa', '#f87171'],
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Poisson',
            data: [breakdown.poisson.home_win, breakdown.poisson.draw, breakdown.poisson.away_win],
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            borderColor: '#fbbf24',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Elo',
            data: [breakdown.elo.home_win, breakdown.elo.draw, breakdown.elo.away_win],
            backgroundColor: 'rgba(167, 139, 250, 0.2)',
            borderColor: '#a78bfa',
            borderWidth: 1,
            borderRadius: 4,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: '#4a6b50', font: { family: 'JetBrains Mono', size: 10 } }
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}%` }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(26,61,34,0.3)' },
            ticks: { color: '#4a6b50', font: { size: 11 } }
          },
          y: {
            min: 0, max: 100,
            grid: { color: 'rgba(26,61,34,0.3)' },
            ticks: {
              color: '#4a6b50', font: { size: 10 },
              callback: v => `${v}%`
            }
          }
        }
      }
    })

    return () => barChart.current?.destroy()
  }, [prediction])

  return (
    <div className="ticket-card p-6">
      <h3 className="font-display text-xs font-600 tracking-[0.3em] uppercase text-[#00ff6a]/60 mb-4">
        Analiză Vizuală
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-mono text-[#4a6b50] mb-3 uppercase tracking-wider">Radar Comparativ</p>
          <canvas ref={radarRef} />
        </div>
        <div>
          <p className="text-xs font-mono text-[#4a6b50] mb-3 uppercase tracking-wider">Probabilități per Model</p>
          <canvas ref={barRef} />
        </div>
      </div>
    </div>
  )
}
