// Utility helper functions
import moment from 'moment-timezone';
import { dateConstants } from './constants/dateConstants';
import { STATUS_DISPLAY_MAP, STATUS_API_MAP } from './constants/constants';

import APIService from '../api/APIService';
import { CONTENT_TYPES } from './constants/apiConstants';

export const formatDate = date => {
  // Add date formatting logic
  return date;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const capitalizeFirstLetter = string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const dataTableRowsPerPageSize = () => {
  return 10;
};

// input 2023-12-09T18:30:00Z => 09 Dec 2023
export const getTextDateFullYearFromUTCDateVal = (
  val,
  timeZone = 'Asia/Kolkata' || dateConstants.TIMEZONE_CONST_ASIA_KOLKATA,
  format = dateConstants.DATE_TIME_CONST_1,
) => {
  if (val) {
    const localDate = moment.utc(val).tz(timeZone);
    const dateVal = localDate.format(format);
    return dateVal;
  } else {
    return '';
  }
};

// Helper function to convert value to number
export const convertToNumber = value => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return Number(value) || 0;
};

// Helper function to prepare chart data
export const prepareChartData = (data, labels, colors) => ({
  labels,
  datasets: [
    {
      data: labels.map((_, index) => convertToNumber(data[index] || 0)),
      backgroundColor: colors,
      borderWidth: 0,
    },
  ],
});

// Create plugin function that uses themeColor constants
export const createChartDataLabelsPlugin = (themeColors, chartConfig) => {
  return {
    id: 'chartDataLabels',
    afterDatasetsDraw: chart => {
      try {
        const ctx = chart.ctx;
        if (!ctx) return;

        // Validate chart structure
        if (!chart.data?.datasets || chart.data.datasets.length === 0) return;

        const dataset = chart.data.datasets[0];
        if (!dataset?.data) return;

        const data = Array.isArray(dataset.data) ? dataset.data : [];
        const backgroundColor = Array.isArray(dataset.backgroundColor)
          ? dataset.backgroundColor
          : [];

        if (data.length === 0) return;

        // Get metadata
        const meta = chart.getDatasetMeta(0);
        if (!meta?.data || meta.data.length === 0) return;

        // Get chart center from first element (all elements share the same center)
        const firstElement = meta.data[0];
        if (
          !firstElement ||
          firstElement.x === undefined ||
          firstElement.y === undefined
        )
          return;

        const chartCenterX = firstElement.x;
        const chartCenterY = firstElement.y;

        // Text color from theme
        const textColor = themeColors.PRIMARY_TEXT_COLOR || '#12121A';
        const defaultSegmentColor = themeColors.PRIMARY_TEXT_COLOR || '#12121A';
        const labelOffset = chartConfig?.LABEL_OFFSET || 40;
        const lineWidth = chartConfig?.CONNECTOR_LINE_WIDTH || 1.5;
        const fontSize = chartConfig?.FONT_SIZE || 16;
        const fontFamily = chartConfig?.FONT_FAMILY || 'Arial, sans-serif';

        // Process each segment
        meta.data.forEach((element, index) => {
          if (!element || index >= data.length) return;

          // Get and convert value
          const numValue = convertToNumber(data[index]);

          // Only show labels for values greater than 0
          if (numValue <= 0) return;

          // Validate segment geometry
          if (
            element.startAngle === undefined ||
            element.endAngle === undefined ||
            element.outerRadius === undefined ||
            element.outerRadius <= 0
          ) {
            return;
          }

          // Calculate angle at segment center
          const midAngle = (element.startAngle + element.endAngle) / 2;

          // Get segment color from background colors array
          const segmentColor =
            Array.isArray(backgroundColor) && backgroundColor[index]
              ? backgroundColor[index]
              : defaultSegmentColor;

          // Calculate positions
          const outerRadius = element.outerRadius;
          const labelRadius = outerRadius + labelOffset;

          // Start point: outer edge of segment
          const startX = chartCenterX + Math.cos(midAngle) * outerRadius;
          const startY = chartCenterY + Math.sin(midAngle) * outerRadius;

          // End point: label position outside chart
          const endX = chartCenterX + Math.cos(midAngle) * labelRadius;
          const endY = chartCenterY + Math.sin(midAngle) * labelRadius;

          // Draw connector line
          ctx.save();
          ctx.strokeStyle = segmentColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Draw label text
          ctx.font = `bold ${fontSize}px ${fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = textColor;
          ctx.fillText(numValue.toString(), endX, endY);
          ctx.restore();
        });
      } catch (error) {
        console.error('Error in chartDataLabelsPlugin:', error);
      }
    },
  };
};

// Helper function to convert API status to display format
export const getDisplayStatus = apiStatus => {
  if (!apiStatus) return 'No Status';
  const normalizedStatus = apiStatus.toLowerCase().replace(/\s+/g, '_');
  return (
    STATUS_DISPLAY_MAP[normalizedStatus] ||
    STATUS_DISPLAY_MAP[apiStatus] ||
    apiStatus
  );
};

// Helper function to convert display status to API format
export const getApiStatus = displayStatus => {
  if (!displayStatus || displayStatus === 'All') return undefined;
  return (
    STATUS_API_MAP[displayStatus] ||
    displayStatus.toLowerCase().replace(/\s+/g, '_')
  );
};
export const objectToFormData = (data, options = {}) => {
  const formData = new FormData();
  const { skipEmpty = true, stringifyObjects = false } = options;

  Object.entries(data).forEach(([key, value]) => {
    if (skipEmpty && (value === null || value === undefined || value === '')) {
      return;
    }

    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const arrayKey = `${key}[${index}]`;
        if (item instanceof File) {
          formData.append(arrayKey, item);
        } else if (typeof item === 'object') {
          formData.append(
            arrayKey,
            stringifyObjects ? JSON.stringify(item) : item,
          );
        } else {
          formData.append(arrayKey, item);
        }
      });
      return;
    }

    if (typeof value === 'object') {
      formData.append(key, stringifyObjects ? JSON.stringify(value) : value);
      return;
    }

    formData.append(key, value);
  });

  return formData;
};

// API Helper Functions
export const postFormData = async (route, data, options) => {
  const formData = objectToFormData(data, options);
  return APIService.post(route, formData, {}, CONTENT_TYPES.FORM_DATA);
};

export const postJson = async (route, data) => {
  return APIService.post(route, data, {}, CONTENT_TYPES.JSON);
};

/**
 * Download a file with given content and filename
 * @param {string} content - The file content (text/csv/json etc.)
 * @param {string} filename - The name of the file to download
 * @param {string} mimeType - The MIME type of the file (default: 'text/csv')
 */
export const downloadFile = (content, filename, mimeType = 'text/csv') => {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};
