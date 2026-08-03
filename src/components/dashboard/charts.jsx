'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { format } from 'date-fns';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { CATEGORIES, SEVERITIES, SEVERITY_ORDER } from '@/lib/constants';

/**
 * Dashboard charts.
 *
 * Colour decisions, deliberately:
 *
 *  · Trend and category charts use ONE hue. The job there is magnitude, and
 *    the category axis already carries identity — painting each bar a
 *    different colour would be decoration that a reader has to decode.
 *  · Severity is a *status* scale, so it uses the reserved severity ramp and
 *    always ships alongside a text label. Identity is never colour-alone.
 *  · There is no second y-axis anywhere. Two measures at different scales get
 *    two charts, not two scales on one.
 *
 * Colours resolve from the same CSS variables the rest of the UI uses, so
 * light and dark are two designed states rather than an automatic inversion.
 */
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const hydrated = useIsHydrated();

  // Reading computed styles during render is a DOM *read*, not a side effect,
  // so this needs no effect and no state — which means no second render pass
  // when the theme flips. The memo re-reads when `resolvedTheme` changes,
  // because that is exactly when the variable values change underneath us.
  return useMemo(() => {
    if (!hydrated) return null;

    const read = (name) =>
      `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;

    return {
      accent: read('--primary'),
      grid: read('--border'),
      axis: read('--muted-foreground'),
      surface: read('--card'),
      ink: read('--foreground'),
      severity: Object.fromEntries(SEVERITY_ORDER.map((key) => [key, read(`--severity-${key}`)])),
    };
    // `resolvedTheme` looks unused to the linter because it is not referenced
    // in the body — but it is precisely the invalidation signal here: the CSS
    // variables this reads resolve to different values per theme, and nothing
    // else tells us they changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, resolvedTheme]);
}

const axisProps = (color) => ({
  stroke: color,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
});

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <p className="font-medium">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="mt-0.5 text-muted-foreground">
          {formatter ? formatter(entry) : `${entry.name}: ${entry.value}`}
        </p>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- trend -- */

export function TrendChart({ data = [] }) {
  const colors = useChartColors();
  if (!colors) return <div className="h-56" />;

  const points = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'd MMM'),
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps(colors.axis)} />
          <YAxis domain={[0, 100]} width={34} {...axisProps(colors.axis)} />
          <RechartsTooltip
            cursor={{ stroke: colors.grid }}
            content={<ChartTooltip formatter={(entry) => `Score: ${entry.value}/100`} />}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Score"
            stroke={colors.accent}
            strokeWidth={2}
            /* ≥8px hit target so the tooltip is reachable by pointer. */
            dot={{ r: 3, fill: colors.surface, stroke: colors.accent, strokeWidth: 2 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------ category -- */

export function CategoryChart({ data = {} }) {
  const colors = useChartColors();
  if (!colors) return <div className="h-56" />;

  const rows = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ name: CATEGORIES[key]?.label ?? key, count }))
    .sort((a, b) => b.count - a.count);

  if (!rows.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No findings yet</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps(colors.axis)} />
          <YAxis type="category" dataKey="name" width={104} {...axisProps(colors.axis)} />
          <RechartsTooltip
            cursor={{ fill: colors.grid, fillOpacity: 0.35 }}
            content={<ChartTooltip formatter={(entry) => `${entry.value} findings`} />}
          />
          {/* Rounded data-end only; the baseline end stays square. */}
          <Bar dataKey="count" name="Findings" fill={colors.accent} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------ severity -- */

export function SeverityChart({ data = {} }) {
  const colors = useChartColors();
  if (!colors) return <div className="h-56" />;

  const rows = SEVERITY_ORDER.filter((key) => (data[key] ?? 0) > 0).map((key) => ({
    key,
    name: SEVERITIES[key].label,
    value: data[key],
    fill: colors.severity[key],
  }));

  if (!rows.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No findings yet</p>;
  }

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div>
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={68}
              /* 2px surface gap between segments so adjacent fills read as
                 separate marks rather than one continuous band. */
              paddingAngle={2}
              stroke={colors.surface}
              strokeWidth={2}
            >
              {rows.map((row) => (
                <Cell key={row.key} fill={row.fill} />
              ))}
            </Pie>
            <RechartsTooltip
              content={<ChartTooltip formatter={(entry) => `${entry.name}: ${entry.value}`} />}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <span className="block text-xl font-bold tabular-nums">{total}</span>
            <span className="block text-[10px] text-muted-foreground">findings</span>
          </div>
        </div>
      </div>

      {/* Legend is not optional: a donut encodes identity by colour, so the
          label is what makes it readable without colour vision. */}
      <ul className="mt-3 space-y-1.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: row.fill }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
