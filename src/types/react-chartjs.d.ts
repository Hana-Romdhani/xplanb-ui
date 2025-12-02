declare module 'react-chartjs-2' {
  import type { ComponentType } from 'react';

  interface ChartComponentProps<TType extends string = string> {
    data: any;
    options?: any;
  }

  export const Line: ComponentType<ChartComponentProps<'line'>>;
  export const Bar: ComponentType<ChartComponentProps<'bar'>>;
  export const Pie: ComponentType<ChartComponentProps<'pie'>>;
}

declare module 'chart.js' {
  export type ChartOptions<TType extends string = string> = any;
  export const Chart: any;
  export const CategoryScale: any;
  export const LinearScale: any;
  export const PointElement: any;
  export const LineElement: any;
  export const BarElement: any;
  export const ArcElement: any;
  export const Tooltip: any;
  export const Legend: any;
  export const Title: any;
}

