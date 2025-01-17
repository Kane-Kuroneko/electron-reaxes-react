const { scaleFactor } = screen.getPrimaryDisplay();

export const windowsDisplayScale = scaleFactor / windowsTextScale;

import { windowsTextScale } from '../getWindowsTextScale';
import { screen } from 'electron';
