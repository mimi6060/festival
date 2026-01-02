"""
Feature Engineering Module for Festival Attendance Prediction

This module handles all feature extraction and transformation for the attendance
prediction model, including:
- Historical attendance features
- Weather data integration
- Program/artist features
- Temporal features
- Ticket sales features
- Special events features
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import logging
import requests
from functools import lru_cache

logger = logging.getLogger(__name__)


class ZoneType(Enum):
    """Types of festival zones"""
    MAIN_STAGE = "main_stage"
    SECONDARY_STAGE = "secondary_stage"
    FOOD_COURT = "food_court"
    BAR = "bar"
    CAMPING = "camping"
    VIP = "vip"
    ENTRANCE = "entrance"
    EXIT = "exit"
    TOILETS = "toilets"
    MEDICAL = "medical"
    MERCHANDISE = "merchandise"


@dataclass
class WeatherData:
    """Weather data structure"""
    timestamp: datetime
    temperature: float  # Celsius
    humidity: float  # Percentage
    precipitation: float  # mm
    wind_speed: float  # km/h
    weather_condition: str  # clear, cloudy, rain, storm
    uv_index: float


@dataclass
class ArtistFeatures:
    """Artist popularity and impact features"""
    artist_id: str
    artist_name: str
    popularity_score: float  # 0-100
    spotify_followers: int
    social_media_score: float
    genre: str
    expected_crowd_size: int
    is_headliner: bool


class FeatureEngineering:
    """
    Feature engineering class for attendance prediction.
    Extracts and transforms features from multiple data sources.
    """

    def __init__(
        self,
        weather_api_key: Optional[str] = None,
        spotify_api_key: Optional[str] = None,
        cache_enabled: bool = True
    ):
        """
        Initialize feature engineering module.

        Args:
            weather_api_key: API key for weather service (OpenWeatherMap)
            spotify_api_key: API key for Spotify artist data
            cache_enabled: Whether to cache API responses
        """
        self.weather_api_key = weather_api_key
        self.spotify_api_key = spotify_api_key
        self.cache_enabled = cache_enabled
        self._weather_cache: Dict[str, WeatherData] = {}

    def extract_features(
        self,
        historical_data: pd.DataFrame,
        festival_info: Dict[str, Any],
        weather_forecast: Optional[List[WeatherData]] = None,
        program_schedule: Optional[pd.DataFrame] = None,
        ticket_sales: Optional[pd.DataFrame] = None,
        target_datetime: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Extract all features for attendance prediction.

        Args:
            historical_data: DataFrame with historical attendance data
            festival_info: Dictionary with festival metadata
            weather_forecast: List of weather forecasts
            program_schedule: DataFrame with artist schedule
            ticket_sales: DataFrame with ticket sales data
            target_datetime: Target datetime for prediction

        Returns:
            DataFrame with all extracted features
        """
        features_list = []

        # Extract temporal features
        temporal_features = self._extract_temporal_features(
            historical_data,
            target_datetime or datetime.now()
        )
        features_list.append(temporal_features)

        # Extract historical pattern features
        historical_features = self._extract_historical_features(historical_data)
        features_list.append(historical_features)

        # Extract weather features
        if weather_forecast:
            weather_features = self._extract_weather_features(
                weather_forecast,
                target_datetime
            )
            features_list.append(weather_features)

        # Extract program features
        if program_schedule is not None and not program_schedule.empty:
            program_features = self._extract_program_features(
                program_schedule,
                target_datetime
            )
            features_list.append(program_features)

        # Extract ticket sales features
        if ticket_sales is not None and not ticket_sales.empty:
            sales_features = self._extract_ticket_features(ticket_sales)
            features_list.append(sales_features)

        # Extract festival-specific features
        festival_features = self._extract_festival_features(festival_info)
        features_list.append(festival_features)

        # Combine all features
        combined_features = pd.concat(features_list, axis=1)

        return combined_features

    def _extract_temporal_features(
        self,
        df: pd.DataFrame,
        target_dt: datetime
    ) -> pd.DataFrame:
        """
        Extract time-based features.

        Features include:
        - Hour of day (cyclical encoding)
        - Day of week (cyclical encoding)
        - Is weekend
        - Is holiday
        - Festival day number
        - Time since festival start
        """
        features = {}

        # Cyclical encoding for hour (24-hour cycle)
        hour = target_dt.hour
        features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
        features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
        features['hour'] = hour

        # Cyclical encoding for day of week (7-day cycle)
        day_of_week = target_dt.weekday()
        features['dow_sin'] = np.sin(2 * np.pi * day_of_week / 7)
        features['dow_cos'] = np.cos(2 * np.pi * day_of_week / 7)
        features['day_of_week'] = day_of_week

        # Binary features
        features['is_weekend'] = 1 if day_of_week >= 5 else 0
        features['is_friday'] = 1 if day_of_week == 4 else 0
        features['is_saturday'] = 1 if day_of_week == 5 else 0
        features['is_sunday'] = 1 if day_of_week == 6 else 0

        # Time periods
        features['is_morning'] = 1 if 6 <= hour < 12 else 0
        features['is_afternoon'] = 1 if 12 <= hour < 18 else 0
        features['is_evening'] = 1 if 18 <= hour < 22 else 0
        features['is_night'] = 1 if hour >= 22 or hour < 6 else 0

        # Peak hours (typically 14h-22h for festivals)
        features['is_peak_hour'] = 1 if 14 <= hour <= 22 else 0

        # Month encoding
        month = target_dt.month
        features['month_sin'] = np.sin(2 * np.pi * month / 12)
        features['month_cos'] = np.cos(2 * np.pi * month / 12)
        features['month'] = month

        # Summer indicator (festival season)
        features['is_summer'] = 1 if month in [6, 7, 8] else 0

        return pd.DataFrame([features])

    def _extract_historical_features(
        self,
        df: pd.DataFrame,
        lookback_hours: int = 24
    ) -> pd.DataFrame:
        """
        Extract features from historical attendance data.

        Features include:
        - Lagged attendance values
        - Rolling averages
        - Rate of change
        - Seasonal patterns
        """
        features = {}

        if df.empty:
            # Return default values for cold start
            return self._get_cold_start_historical_features()

        # Ensure datetime index
        if 'timestamp' in df.columns:
            df = df.set_index('timestamp')

        attendance_col = 'attendance' if 'attendance' in df.columns else df.columns[0]

        # Lagged features (past attendance)
        for lag in [1, 2, 3, 6, 12, 24]:
            col_name = f'attendance_lag_{lag}h'
            if len(df) > lag:
                features[col_name] = df[attendance_col].iloc[-lag]
            else:
                features[col_name] = df[attendance_col].mean() if len(df) > 0 else 0

        # Rolling statistics
        for window in [3, 6, 12, 24]:
            if len(df) >= window:
                rolling = df[attendance_col].rolling(window=window)
                features[f'rolling_mean_{window}h'] = rolling.mean().iloc[-1]
                features[f'rolling_std_{window}h'] = rolling.std().iloc[-1]
                features[f'rolling_min_{window}h'] = rolling.min().iloc[-1]
                features[f'rolling_max_{window}h'] = rolling.max().iloc[-1]
            else:
                mean_val = df[attendance_col].mean() if len(df) > 0 else 0
                features[f'rolling_mean_{window}h'] = mean_val
                features[f'rolling_std_{window}h'] = 0
                features[f'rolling_min_{window}h'] = mean_val
                features[f'rolling_max_{window}h'] = mean_val

        # Rate of change
        if len(df) >= 2:
            features['attendance_change_1h'] = (
                df[attendance_col].iloc[-1] - df[attendance_col].iloc[-2]
            )
        else:
            features['attendance_change_1h'] = 0

        if len(df) >= 3:
            features['attendance_change_2h'] = (
                df[attendance_col].iloc[-1] - df[attendance_col].iloc[-3]
            )
        else:
            features['attendance_change_2h'] = 0

        # Trend indicator
        if len(df) >= 3:
            recent = df[attendance_col].iloc[-3:].values
            features['is_increasing'] = 1 if recent[-1] > recent[0] else 0
            features['trend_slope'] = np.polyfit(range(3), recent, 1)[0]
        else:
            features['is_increasing'] = 0
            features['trend_slope'] = 0

        # Peak statistics from historical data
        if len(df) > 0:
            features['historical_max'] = df[attendance_col].max()
            features['historical_mean'] = df[attendance_col].mean()
            features['historical_std'] = df[attendance_col].std()
            features['current_vs_max_ratio'] = (
                df[attendance_col].iloc[-1] / df[attendance_col].max()
                if df[attendance_col].max() > 0 else 0
            )
        else:
            features['historical_max'] = 0
            features['historical_mean'] = 0
            features['historical_std'] = 0
            features['current_vs_max_ratio'] = 0

        return pd.DataFrame([features])

    def _get_cold_start_historical_features(self) -> pd.DataFrame:
        """Return default feature values for cold start scenarios."""
        features = {}

        # Lagged features
        for lag in [1, 2, 3, 6, 12, 24]:
            features[f'attendance_lag_{lag}h'] = 0

        # Rolling statistics
        for window in [3, 6, 12, 24]:
            features[f'rolling_mean_{window}h'] = 0
            features[f'rolling_std_{window}h'] = 0
            features[f'rolling_min_{window}h'] = 0
            features[f'rolling_max_{window}h'] = 0

        # Rate of change
        features['attendance_change_1h'] = 0
        features['attendance_change_2h'] = 0
        features['is_increasing'] = 0
        features['trend_slope'] = 0

        # Peak statistics
        features['historical_max'] = 0
        features['historical_mean'] = 0
        features['historical_std'] = 0
        features['current_vs_max_ratio'] = 0

        return pd.DataFrame([features])

    def _extract_weather_features(
        self,
        weather_data: List[WeatherData],
        target_dt: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Extract weather-related features.

        Weather significantly impacts festival attendance:
        - Rain reduces outdoor attendance
        - High temperature affects comfort
        - Wind impacts outdoor activities
        """
        features = {}

        if not weather_data:
            return self._get_default_weather_features()

        # Find closest weather data to target time
        if target_dt:
            closest_weather = min(
                weather_data,
                key=lambda w: abs((w.timestamp - target_dt).total_seconds())
            )
        else:
            closest_weather = weather_data[0]

        # Temperature features
        features['temperature'] = closest_weather.temperature
        features['temperature_squared'] = closest_weather.temperature ** 2
        features['is_comfortable_temp'] = 1 if 18 <= closest_weather.temperature <= 28 else 0
        features['is_hot'] = 1 if closest_weather.temperature > 30 else 0
        features['is_cold'] = 1 if closest_weather.temperature < 15 else 0

        # Humidity and precipitation
        features['humidity'] = closest_weather.humidity
        features['precipitation'] = closest_weather.precipitation
        features['is_rainy'] = 1 if closest_weather.precipitation > 0.5 else 0
        features['is_heavy_rain'] = 1 if closest_weather.precipitation > 5 else 0

        # Wind
        features['wind_speed'] = closest_weather.wind_speed
        features['is_windy'] = 1 if closest_weather.wind_speed > 20 else 0

        # UV Index
        features['uv_index'] = closest_weather.uv_index
        features['high_uv'] = 1 if closest_weather.uv_index > 6 else 0

        # Weather condition encoding
        weather_conditions = ['clear', 'cloudy', 'rain', 'storm', 'fog']
        for condition in weather_conditions:
            features[f'weather_{condition}'] = (
                1 if closest_weather.weather_condition == condition else 0
            )

        # Combined weather score (higher = better for attendance)
        weather_score = 100
        weather_score -= abs(closest_weather.temperature - 23) * 2  # Optimal temp around 23
        weather_score -= closest_weather.precipitation * 10
        weather_score -= max(0, closest_weather.wind_speed - 15) * 2
        if closest_weather.weather_condition in ['rain', 'storm']:
            weather_score -= 30
        features['weather_score'] = max(0, min(100, weather_score))

        return pd.DataFrame([features])

    def _get_default_weather_features(self) -> pd.DataFrame:
        """Return default weather features when no data available."""
        features = {
            'temperature': 22,
            'temperature_squared': 484,
            'is_comfortable_temp': 1,
            'is_hot': 0,
            'is_cold': 0,
            'humidity': 50,
            'precipitation': 0,
            'is_rainy': 0,
            'is_heavy_rain': 0,
            'wind_speed': 10,
            'is_windy': 0,
            'uv_index': 5,
            'high_uv': 0,
            'weather_clear': 1,
            'weather_cloudy': 0,
            'weather_rain': 0,
            'weather_storm': 0,
            'weather_fog': 0,
            'weather_score': 80,
        }
        return pd.DataFrame([features])

    def _extract_program_features(
        self,
        program_df: pd.DataFrame,
        target_dt: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Extract features from festival program.

        Artist popularity and schedule significantly impact zone attendance.
        """
        features = {}
        target_dt = target_dt or datetime.now()

        # Filter performances around target time (within 2 hours)
        time_window = timedelta(hours=2)

        if 'start_time' in program_df.columns:
            upcoming = program_df[
                (program_df['start_time'] >= target_dt - time_window) &
                (program_df['start_time'] <= target_dt + time_window)
            ]
        else:
            upcoming = program_df

        if len(upcoming) == 0:
            return self._get_default_program_features()

        # Number of simultaneous performances
        features['num_performances'] = len(upcoming)

        # Popularity scores
        if 'popularity_score' in upcoming.columns:
            features['max_artist_popularity'] = upcoming['popularity_score'].max()
            features['avg_artist_popularity'] = upcoming['popularity_score'].mean()
            features['total_popularity'] = upcoming['popularity_score'].sum()
        else:
            features['max_artist_popularity'] = 50
            features['avg_artist_popularity'] = 50
            features['total_popularity'] = 50 * len(upcoming)

        # Headliner presence
        if 'is_headliner' in upcoming.columns:
            features['has_headliner'] = 1 if upcoming['is_headliner'].any() else 0
            features['num_headliners'] = upcoming['is_headliner'].sum()
        else:
            features['has_headliner'] = 0
            features['num_headliners'] = 0

        # Genre diversity
        if 'genre' in upcoming.columns:
            features['genre_diversity'] = upcoming['genre'].nunique()
        else:
            features['genre_diversity'] = 1

        # Stage distribution
        if 'stage_id' in upcoming.columns:
            features['active_stages'] = upcoming['stage_id'].nunique()
        else:
            features['active_stages'] = 1

        # Expected crowd from artist data
        if 'expected_crowd' in upcoming.columns:
            features['total_expected_crowd'] = upcoming['expected_crowd'].sum()
        else:
            features['total_expected_crowd'] = features.get('avg_artist_popularity', 50) * 100

        # Time until next headliner
        if 'is_headliner' in program_df.columns and 'start_time' in program_df.columns:
            future_headliners = program_df[
                (program_df['is_headliner'] == True) &
                (program_df['start_time'] > target_dt)
            ]
            if len(future_headliners) > 0:
                next_headliner_time = future_headliners['start_time'].min()
                features['hours_to_next_headliner'] = (
                    (next_headliner_time - target_dt).total_seconds() / 3600
                )
            else:
                features['hours_to_next_headliner'] = 24
        else:
            features['hours_to_next_headliner'] = 24

        return pd.DataFrame([features])

    def _get_default_program_features(self) -> pd.DataFrame:
        """Return default program features."""
        features = {
            'num_performances': 0,
            'max_artist_popularity': 0,
            'avg_artist_popularity': 0,
            'total_popularity': 0,
            'has_headliner': 0,
            'num_headliners': 0,
            'genre_diversity': 0,
            'active_stages': 0,
            'total_expected_crowd': 0,
            'hours_to_next_headliner': 24,
        }
        return pd.DataFrame([features])

    def _extract_ticket_features(
        self,
        ticket_sales: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Extract features from ticket sales data.

        Ticket sales provide a strong indicator of expected attendance.
        """
        features = {}

        if ticket_sales.empty:
            return self._get_default_ticket_features()

        # Total tickets sold
        if 'quantity' in ticket_sales.columns:
            features['total_tickets_sold'] = ticket_sales['quantity'].sum()
        elif 'count' in ticket_sales.columns:
            features['total_tickets_sold'] = ticket_sales['count'].sum()
        else:
            features['total_tickets_sold'] = len(ticket_sales)

        # Tickets by type
        if 'ticket_type' in ticket_sales.columns:
            for ticket_type in ['day_pass', 'weekend_pass', 'vip', 'camping']:
                type_sales = ticket_sales[ticket_sales['ticket_type'] == ticket_type]
                if 'quantity' in type_sales.columns:
                    features[f'tickets_{ticket_type}'] = type_sales['quantity'].sum()
                else:
                    features[f'tickets_{ticket_type}'] = len(type_sales)
        else:
            features['tickets_day_pass'] = 0
            features['tickets_weekend_pass'] = 0
            features['tickets_vip'] = 0
            features['tickets_camping'] = 0

        # Sales velocity (recent sales rate)
        if 'sale_date' in ticket_sales.columns:
            ticket_sales['sale_date'] = pd.to_datetime(ticket_sales['sale_date'])
            last_24h = ticket_sales[
                ticket_sales['sale_date'] > datetime.now() - timedelta(hours=24)
            ]
            features['sales_last_24h'] = len(last_24h)

            last_week = ticket_sales[
                ticket_sales['sale_date'] > datetime.now() - timedelta(days=7)
            ]
            features['sales_last_week'] = len(last_week)
        else:
            features['sales_last_24h'] = 0
            features['sales_last_week'] = 0

        # Capacity utilization
        if 'max_capacity' in ticket_sales.columns:
            max_cap = ticket_sales['max_capacity'].iloc[0]
            features['capacity_utilization'] = features['total_tickets_sold'] / max_cap
        else:
            features['capacity_utilization'] = 0.5

        return pd.DataFrame([features])

    def _get_default_ticket_features(self) -> pd.DataFrame:
        """Return default ticket features."""
        features = {
            'total_tickets_sold': 0,
            'tickets_day_pass': 0,
            'tickets_weekend_pass': 0,
            'tickets_vip': 0,
            'tickets_camping': 0,
            'sales_last_24h': 0,
            'sales_last_week': 0,
            'capacity_utilization': 0,
        }
        return pd.DataFrame([features])

    def _extract_festival_features(
        self,
        festival_info: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Extract festival-specific features.
        """
        features = {}

        # Festival size category
        max_capacity = festival_info.get('max_capacity', 10000)
        features['max_capacity'] = max_capacity
        features['is_small_festival'] = 1 if max_capacity < 5000 else 0
        features['is_medium_festival'] = 1 if 5000 <= max_capacity < 50000 else 0
        features['is_large_festival'] = 1 if max_capacity >= 50000 else 0

        # Festival duration
        features['festival_duration_days'] = festival_info.get('duration_days', 3)

        # Festival edition (experience factor)
        features['edition_number'] = festival_info.get('edition_number', 1)
        features['is_first_edition'] = 1 if festival_info.get('edition_number', 1) == 1 else 0

        # Festival day within event
        features['festival_day'] = festival_info.get('current_day', 1)
        features['is_first_day'] = 1 if festival_info.get('current_day', 1) == 1 else 0
        features['is_last_day'] = (
            1 if festival_info.get('current_day', 1) == festival_info.get('duration_days', 3)
            else 0
        )

        # Number of zones
        features['num_zones'] = festival_info.get('num_zones', 5)
        features['num_stages'] = festival_info.get('num_stages', 2)

        return pd.DataFrame([features])

    def fetch_weather_forecast(
        self,
        latitude: float,
        longitude: float,
        hours_ahead: int = 48
    ) -> List[WeatherData]:
        """
        Fetch weather forecast from external API.

        Args:
            latitude: Festival location latitude
            longitude: Festival location longitude
            hours_ahead: Number of hours to forecast

        Returns:
            List of WeatherData objects
        """
        if not self.weather_api_key:
            logger.warning("No weather API key provided, using default values")
            return []

        cache_key = f"{latitude}_{longitude}_{datetime.now().strftime('%Y%m%d%H')}"
        if self.cache_enabled and cache_key in self._weather_cache:
            return [self._weather_cache[cache_key]]

        try:
            url = f"https://api.openweathermap.org/data/2.5/forecast"
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.weather_api_key,
                'units': 'metric',
                'cnt': hours_ahead // 3  # API returns 3-hour intervals
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            weather_list = []
            for item in data.get('list', []):
                weather = WeatherData(
                    timestamp=datetime.fromtimestamp(item['dt']),
                    temperature=item['main']['temp'],
                    humidity=item['main']['humidity'],
                    precipitation=item.get('rain', {}).get('3h', 0),
                    wind_speed=item['wind']['speed'] * 3.6,  # Convert m/s to km/h
                    weather_condition=self._map_weather_condition(
                        item['weather'][0]['main']
                    ),
                    uv_index=item.get('uvi', 5)
                )
                weather_list.append(weather)

            if self.cache_enabled and weather_list:
                self._weather_cache[cache_key] = weather_list[0]

            return weather_list

        except Exception as e:
            logger.error(f"Failed to fetch weather data: {e}")
            return []

    def _map_weather_condition(self, condition: str) -> str:
        """Map OpenWeatherMap condition to internal condition."""
        mapping = {
            'Clear': 'clear',
            'Clouds': 'cloudy',
            'Rain': 'rain',
            'Drizzle': 'rain',
            'Thunderstorm': 'storm',
            'Snow': 'rain',  # Treat snow as rain for festival context
            'Mist': 'fog',
            'Fog': 'fog',
            'Haze': 'fog',
        }
        return mapping.get(condition, 'cloudy')

    def get_feature_names(self) -> List[str]:
        """
        Return list of all feature names in order.
        Useful for model interpretation and SHAP values.
        """
        # Generate a dummy feature set to get column names
        dummy_historical = pd.DataFrame({
            'timestamp': [datetime.now()],
            'attendance': [1000]
        })
        dummy_festival = {
            'max_capacity': 10000,
            'duration_days': 3,
            'edition_number': 1,
            'current_day': 1,
            'num_zones': 5,
            'num_stages': 2,
        }

        features = self.extract_features(
            historical_data=dummy_historical,
            festival_info=dummy_festival
        )

        return features.columns.tolist()

    def scale_features(
        self,
        features: pd.DataFrame,
        scaler: Optional[Any] = None,
        fit: bool = False
    ) -> Tuple[pd.DataFrame, Any]:
        """
        Scale features using StandardScaler or provided scaler.

        Args:
            features: DataFrame with features to scale
            scaler: Pre-fitted scaler or None
            fit: Whether to fit the scaler

        Returns:
            Tuple of (scaled features DataFrame, fitted scaler)
        """
        from sklearn.preprocessing import StandardScaler

        if scaler is None:
            scaler = StandardScaler()

        if fit:
            scaled_values = scaler.fit_transform(features)
        else:
            scaled_values = scaler.transform(features)

        scaled_df = pd.DataFrame(
            scaled_values,
            columns=features.columns,
            index=features.index
        )

        return scaled_df, scaler


def create_zone_specific_features(
    zone_type: ZoneType,
    base_features: pd.DataFrame,
    zone_historical: Optional[pd.DataFrame] = None
) -> pd.DataFrame:
    """
    Create zone-specific feature adjustments.

    Different zones have different attendance patterns:
    - Main stage: highest during headliners
    - Food court: peak during meal times
    - Bar: peak in evening/night
    - Camping: consistent overnight
    """
    zone_features = base_features.copy()

    # Zone type one-hot encoding
    for zt in ZoneType:
        zone_features[f'zone_{zt.value}'] = 1 if zone_type == zt else 0

    # Zone-specific temporal adjustments
    hour = base_features.get('hour', [12])[0] if 'hour' in base_features.columns else 12

    if zone_type == ZoneType.MAIN_STAGE:
        zone_features['zone_peak_factor'] = 1.5 if 18 <= hour <= 23 else 1.0
    elif zone_type == ZoneType.FOOD_COURT:
        zone_features['zone_peak_factor'] = (
            1.5 if (11 <= hour <= 14) or (18 <= hour <= 21) else 1.0
        )
    elif zone_type == ZoneType.BAR:
        zone_features['zone_peak_factor'] = 1.5 if 20 <= hour <= 2 else 1.0
    elif zone_type == ZoneType.CAMPING:
        zone_features['zone_peak_factor'] = 1.5 if hour <= 8 or hour >= 23 else 0.8
    else:
        zone_features['zone_peak_factor'] = 1.0

    return zone_features
