import React, { useState, useEffect } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart,
  EffectScatterChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  LinesChart,
  PieChart,
  ScatterChart,
} from 'echarts/charts';
import {
  CalendarComponent,
  DatasetComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components (tree-shakeable)
echarts.use([
  BarChart,
  EffectScatterChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  LinesChart,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  GraphicComponent,
  CalendarComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

// Register liquidfill & wordcloud (plugins auto-register on import)
import 'echarts-liquidfill';
import 'echarts-wordcloud';

export { echarts };
