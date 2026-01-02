"""
Time Series Models for Festival Attendance Prediction

This module implements various time series forecasting models:
- Facebook Prophet for trend and seasonality decomposition
- ARIMA/SARIMA for statistical forecasting
- LSTM neural networks for deep learning approach
- Exponential Smoothing for short-term forecasting
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import logging
import pickle
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ForecastResult:
    """Structure for forecast results"""
    timestamp: datetime
    prediction: float
    lower_bound: float
    upper_bound: float
    confidence_level: float = 0.95


@dataclass
class ModelMetrics:
    """Model evaluation metrics"""
    mae: float
    mape: float
    rmse: float
    r2_score: float
    coverage: float  # Percentage of actual values within prediction interval


class BaseTimeSeriesModel(ABC):
    """Abstract base class for time series models"""

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.is_fitted = False
        self.model = None
        self.metrics: Optional[ModelMetrics] = None

    @abstractmethod
    def fit(
        self,
        data: pd.DataFrame,
        target_column: str = 'attendance'
    ) -> 'BaseTimeSeriesModel':
        """Fit the model to historical data."""
        pass

    @abstractmethod
    def predict(
        self,
        horizon: int,
        return_intervals: bool = True
    ) -> List[ForecastResult]:
        """Generate forecasts."""
        pass

    @abstractmethod
    def save(self, path: str) -> None:
        """Save model to disk."""
        pass

    @abstractmethod
    def load(self, path: str) -> 'BaseTimeSeriesModel':
        """Load model from disk."""
        pass


class ProphetModel(BaseTimeSeriesModel):
    """
    Facebook Prophet model for attendance forecasting.

    Prophet is excellent for:
    - Handling multiple seasonalities (hourly, daily, weekly)
    - Incorporating holiday effects
    - Dealing with missing data
    - Capturing trend changes
    """

    def __init__(
        self,
        yearly_seasonality: bool = False,
        weekly_seasonality: bool = True,
        daily_seasonality: bool = True,
        holidays_df: Optional[pd.DataFrame] = None,
        changepoint_prior_scale: float = 0.05,
        seasonality_prior_scale: float = 10.0,
        interval_width: float = 0.95,
        mcmc_samples: int = 0
    ):
        """
        Initialize Prophet model.

        Args:
            yearly_seasonality: Include yearly patterns
            weekly_seasonality: Include weekly patterns (important for festivals)
            daily_seasonality: Include daily patterns (crucial for hourly predictions)
            holidays_df: DataFrame with special events/headliners
            changepoint_prior_scale: Flexibility of trend changes
            seasonality_prior_scale: Strength of seasonality
            interval_width: Confidence interval width
            mcmc_samples: Number of MCMC samples (0 = MAP estimation)
        """
        super().__init__("Prophet")
        self.yearly_seasonality = yearly_seasonality
        self.weekly_seasonality = weekly_seasonality
        self.daily_seasonality = daily_seasonality
        self.holidays_df = holidays_df
        self.changepoint_prior_scale = changepoint_prior_scale
        self.seasonality_prior_scale = seasonality_prior_scale
        self.interval_width = interval_width
        self.mcmc_samples = mcmc_samples
        self.last_date: Optional[datetime] = None

    def fit(
        self,
        data: pd.DataFrame,
        target_column: str = 'attendance'
    ) -> 'ProphetModel':
        """
        Fit Prophet model to historical data.

        Args:
            data: DataFrame with datetime index or 'timestamp' column
            target_column: Name of the target variable column

        Returns:
            Fitted model instance
        """
        try:
            from prophet import Prophet
        except ImportError:
            logger.error("Prophet not installed. Install with: pip install prophet")
            raise

        # Prepare data for Prophet (requires 'ds' and 'y' columns)
        prophet_df = self._prepare_data(data, target_column)

        if len(prophet_df) < 2:
            raise ValueError("Not enough data points for Prophet model")

        # Initialize Prophet
        self.model = Prophet(
            yearly_seasonality=self.yearly_seasonality,
            weekly_seasonality=self.weekly_seasonality,
            daily_seasonality=self.daily_seasonality,
            changepoint_prior_scale=self.changepoint_prior_scale,
            seasonality_prior_scale=self.seasonality_prior_scale,
            interval_width=self.interval_width,
            mcmc_samples=self.mcmc_samples
        )

        # Add custom seasonalities for festival patterns
        self.model.add_seasonality(
            name='hourly',
            period=24 / 24,  # 1 day in days
            fourier_order=8
        )

        # Add holidays/special events if provided
        if self.holidays_df is not None:
            self.model.holidays = self.holidays_df

        # Fit model
        self.model.fit(prophet_df, iter=500)
        self.last_date = prophet_df['ds'].max()
        self.is_fitted = True

        logger.info(f"Prophet model fitted with {len(prophet_df)} data points")
        return self

    def predict(
        self,
        horizon: int = 24,
        return_intervals: bool = True,
        freq: str = 'H'
    ) -> List[ForecastResult]:
        """
        Generate forecasts for future time periods.

        Args:
            horizon: Number of periods to forecast
            return_intervals: Whether to include prediction intervals
            freq: Frequency of predictions ('H' for hourly, 'D' for daily)

        Returns:
            List of ForecastResult objects
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")

        # Create future dataframe
        future = self.model.make_future_dataframe(
            periods=horizon,
            freq=freq,
            include_history=False
        )

        # Generate predictions
        forecast = self.model.predict(future)

        # Convert to ForecastResult objects
        results = []
        for _, row in forecast.iterrows():
            result = ForecastResult(
                timestamp=row['ds'].to_pydatetime(),
                prediction=max(0, row['yhat']),  # Attendance can't be negative
                lower_bound=max(0, row['yhat_lower']),
                upper_bound=max(0, row['yhat_upper']),
                confidence_level=self.interval_width
            )
            results.append(result)

        return results

    def predict_at_time(
        self,
        target_time: datetime
    ) -> ForecastResult:
        """
        Generate prediction for a specific time.

        Args:
            target_time: Target datetime for prediction

        Returns:
            Single ForecastResult
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")

        future = pd.DataFrame({'ds': [target_time]})
        forecast = self.model.predict(future)

        return ForecastResult(
            timestamp=target_time,
            prediction=max(0, forecast['yhat'].iloc[0]),
            lower_bound=max(0, forecast['yhat_lower'].iloc[0]),
            upper_bound=max(0, forecast['yhat_upper'].iloc[0]),
            confidence_level=self.interval_width
        )

    def _prepare_data(
        self,
        data: pd.DataFrame,
        target_column: str
    ) -> pd.DataFrame:
        """Prepare data for Prophet format."""
        df = data.copy()

        # Handle datetime column
        if 'timestamp' in df.columns:
            df['ds'] = pd.to_datetime(df['timestamp'])
        elif isinstance(df.index, pd.DatetimeIndex):
            df['ds'] = df.index
        else:
            raise ValueError("Data must have 'timestamp' column or DatetimeIndex")

        # Target column
        df['y'] = df[target_column]

        # Select only required columns
        prophet_df = df[['ds', 'y']].dropna()

        return prophet_df

    def get_components(self) -> Dict[str, pd.DataFrame]:
        """
        Get decomposed components (trend, seasonality).

        Returns:
            Dictionary with component DataFrames
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted first")

        from prophet.plot import plot_components_plotly, plot_plotly

        # Generate forecast for component extraction
        future = self.model.make_future_dataframe(periods=0)
        forecast = self.model.predict(future)

        components = {
            'trend': forecast[['ds', 'trend']],
            'daily': forecast[['ds', 'daily']] if 'daily' in forecast.columns else None,
            'weekly': forecast[['ds', 'weekly']] if 'weekly' in forecast.columns else None,
        }

        return {k: v for k, v in components.items() if v is not None}

    def save(self, path: str) -> None:
        """Save model to disk."""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")

        model_data = {
            'model': self.model,
            'config': {
                'yearly_seasonality': self.yearly_seasonality,
                'weekly_seasonality': self.weekly_seasonality,
                'daily_seasonality': self.daily_seasonality,
                'changepoint_prior_scale': self.changepoint_prior_scale,
                'seasonality_prior_scale': self.seasonality_prior_scale,
                'interval_width': self.interval_width,
            },
            'last_date': self.last_date,
            'metrics': self.metrics,
        }

        with open(path, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info(f"Prophet model saved to {path}")

    def load(self, path: str) -> 'ProphetModel':
        """Load model from disk."""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)

        self.model = model_data['model']
        self.last_date = model_data['last_date']
        self.metrics = model_data.get('metrics')
        self.is_fitted = True

        # Restore config
        config = model_data['config']
        self.yearly_seasonality = config['yearly_seasonality']
        self.weekly_seasonality = config['weekly_seasonality']
        self.daily_seasonality = config['daily_seasonality']
        self.changepoint_prior_scale = config['changepoint_prior_scale']
        self.seasonality_prior_scale = config['seasonality_prior_scale']
        self.interval_width = config['interval_width']

        logger.info(f"Prophet model loaded from {path}")
        return self


class ARIMAModel(BaseTimeSeriesModel):
    """
    ARIMA/SARIMA model for attendance forecasting.

    ARIMA is good for:
    - Stationary time series
    - Short-term forecasting
    - Capturing autocorrelation
    """

    def __init__(
        self,
        order: Tuple[int, int, int] = (1, 1, 1),
        seasonal_order: Optional[Tuple[int, int, int, int]] = (1, 1, 1, 24),
        trend: str = 'c',
        enforce_stationarity: bool = True,
        enforce_invertibility: bool = True
    ):
        """
        Initialize ARIMA model.

        Args:
            order: (p, d, q) order of the model
            seasonal_order: (P, D, Q, s) seasonal order
            trend: 'n' for none, 'c' for constant, 't' for linear trend
            enforce_stationarity: Whether to enforce stationarity
            enforce_invertibility: Whether to enforce invertibility
        """
        super().__init__("ARIMA")
        self.order = order
        self.seasonal_order = seasonal_order
        self.trend = trend
        self.enforce_stationarity = enforce_stationarity
        self.enforce_invertibility = enforce_invertibility
        self.last_values: Optional[np.ndarray] = None

    def fit(
        self,
        data: pd.DataFrame,
        target_column: str = 'attendance'
    ) -> 'ARIMAModel':
        """
        Fit ARIMA model to historical data.

        Args:
            data: DataFrame with time series data
            target_column: Name of target column

        Returns:
            Fitted model instance
        """
        try:
            from statsmodels.tsa.statespace.sarimax import SARIMAX
        except ImportError:
            logger.error("statsmodels not installed")
            raise

        # Prepare data
        y = data[target_column].values

        if len(y) < 50:
            logger.warning("Limited data for ARIMA, results may be unstable")

        # Fit SARIMAX model
        self.model = SARIMAX(
            y,
            order=self.order,
            seasonal_order=self.seasonal_order,
            trend=self.trend,
            enforce_stationarity=self.enforce_stationarity,
            enforce_invertibility=self.enforce_invertibility
        )

        self.fitted_model = self.model.fit(disp=False)
        self.last_values = y
        self.is_fitted = True

        logger.info(f"ARIMA model fitted with order {self.order}")
        return self

    def predict(
        self,
        horizon: int = 24,
        return_intervals: bool = True
    ) -> List[ForecastResult]:
        """
        Generate forecasts.

        Args:
            horizon: Number of periods ahead
            return_intervals: Whether to include confidence intervals

        Returns:
            List of ForecastResult objects
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")

        # Get forecasts with confidence intervals
        forecast = self.fitted_model.get_forecast(steps=horizon)
        predictions = forecast.predicted_mean
        conf_int = forecast.conf_int(alpha=0.05)

        # Generate timestamps (assuming hourly data)
        start_time = datetime.now()
        results = []

        for i in range(horizon):
            timestamp = start_time + timedelta(hours=i)
            results.append(ForecastResult(
                timestamp=timestamp,
                prediction=max(0, predictions.iloc[i]),
                lower_bound=max(0, conf_int.iloc[i, 0]),
                upper_bound=max(0, conf_int.iloc[i, 1]),
                confidence_level=0.95
            ))

        return results

    def auto_fit(
        self,
        data: pd.DataFrame,
        target_column: str = 'attendance',
        max_p: int = 3,
        max_q: int = 3,
        max_d: int = 2
    ) -> 'ARIMAModel':
        """
        Automatically find best ARIMA parameters.

        Uses AIC to select optimal order.
        """
        try:
            from pmdarima import auto_arima
        except ImportError:
            logger.warning("pmdarima not installed, using default parameters")
            return self.fit(data, target_column)

        y = data[target_column].values

        # Auto ARIMA
        auto_model = auto_arima(
            y,
            start_p=0,
            start_q=0,
            max_p=max_p,
            max_q=max_q,
            max_d=max_d,
            m=24,  # Hourly seasonality
            seasonal=True,
            trace=True,
            error_action='ignore',
            suppress_warnings=True,
            stepwise=True
        )

        self.order = auto_model.order
        self.seasonal_order = auto_model.seasonal_order

        logger.info(f"Auto ARIMA selected order: {self.order}, seasonal: {self.seasonal_order}")

        return self.fit(data, target_column)

    def save(self, path: str) -> None:
        """Save model to disk."""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")

        model_data = {
            'fitted_model': self.fitted_model,
            'order': self.order,
            'seasonal_order': self.seasonal_order,
            'last_values': self.last_values,
            'metrics': self.metrics,
        }

        joblib.dump(model_data, path)
        logger.info(f"ARIMA model saved to {path}")

    def load(self, path: str) -> 'ARIMAModel':
        """Load model from disk."""
        model_data = joblib.load(path)

        self.fitted_model = model_data['fitted_model']
        self.order = model_data['order']
        self.seasonal_order = model_data['seasonal_order']
        self.last_values = model_data['last_values']
        self.metrics = model_data.get('metrics')
        self.is_fitted = True

        logger.info(f"ARIMA model loaded from {path}")
        return self


class LSTMModel(BaseTimeSeriesModel):
    """
    LSTM Neural Network for attendance forecasting.

    LSTM excels at:
    - Capturing long-term dependencies
    - Non-linear patterns
    - Complex seasonal interactions
    """

    def __init__(
        self,
        sequence_length: int = 24,
        hidden_units: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
        learning_rate: float = 0.001,
        epochs: int = 100,
        batch_size: int = 32,
        early_stopping_patience: int = 10
    ):
        """
        Initialize LSTM model.

        Args:
            sequence_length: Number of past time steps to use
            hidden_units: Number of LSTM units per layer
            num_layers: Number of LSTM layers
            dropout: Dropout rate for regularization
            learning_rate: Adam optimizer learning rate
            epochs: Maximum training epochs
            batch_size: Training batch size
            early_stopping_patience: Epochs to wait before early stopping
        """
        super().__init__("LSTM")
        self.sequence_length = sequence_length
        self.hidden_units = hidden_units
        self.num_layers = num_layers
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.batch_size = batch_size
        self.early_stopping_patience = early_stopping_patience
        self.scaler = None
        self.last_sequence: Optional[np.ndarray] = None

    def _build_model(self, input_shape: Tuple[int, int]) -> Any:
        """Build LSTM architecture."""
        try:
            import tensorflow as tf
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.layers import LSTM, Dense, Dropout
            from tensorflow.keras.optimizers import Adam
        except ImportError:
            logger.error("TensorFlow not installed")
            raise

        model = Sequential()

        # First LSTM layer
        model.add(LSTM(
            units=self.hidden_units,
            return_sequences=(self.num_layers > 1),
            input_shape=input_shape
        ))
        model.add(Dropout(self.dropout))

        # Additional LSTM layers
        for i in range(1, self.num_layers):
            return_seq = i < self.num_layers - 1
            model.add(LSTM(units=self.hidden_units, return_sequences=return_seq))
            model.add(Dropout(self.dropout))

        # Output layer
        model.add(Dense(1))

        model.compile(
            optimizer=Adam(learning_rate=self.learning_rate),
            loss='mse',
            metrics=['mae']
        )

        return model

    def _create_sequences(
        self,
        data: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training."""
        X, y = [], []
        for i in range(self.sequence_length, len(data)):
            X.append(data[i - self.sequence_length:i])
            y.append(data[i])
        return np.array(X), np.array(y)

    def fit(
        self,
        data: pd.DataFrame,
        target_column: str = 'attendance'
    ) -> 'LSTMModel':
        """
        Fit LSTM model to historical data.

        Args:
            data: DataFrame with time series data
            target_column: Name of target column

        Returns:
            Fitted model instance
        """
        try:
            from sklearn.preprocessing import MinMaxScaler
            from tensorflow.keras.callbacks import EarlyStopping
        except ImportError:
            raise ImportError("sklearn and tensorflow are required for LSTM")

        # Prepare data
        values = data[target_column].values.reshape(-1, 1)

        # Scale data
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = self.scaler.fit_transform(values)

        # Create sequences
        X, y = self._create_sequences(scaled_data)

        if len(X) < self.batch_size:
            raise ValueError(f"Not enough data for LSTM. Need at least {self.sequence_length + self.batch_size} points")

        # Reshape for LSTM [samples, time steps, features]
        X = X.reshape((X.shape[0], X.shape[1], 1))

        # Build model
        self.model = self._build_model((self.sequence_length, 1))

        # Early stopping
        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=self.early_stopping_patience,
            restore_best_weights=True
        )

        # Train
        self.model.fit(
            X, y,
            epochs=self.epochs,
            batch_size=self.batch_size,
            validation_split=0.2,
            callbacks=[early_stop],
            verbose=0
        )

        # Store last sequence for predictions
        self.last_sequence = scaled_data[-self.sequence_length:]
        self.is_fitted = True

        logger.info(f"LSTM model fitted with {len(X)} sequences")
        return self

    def predict(
        self,
        horizon: int = 24,
        return_intervals: bool = True
    ) -> List[ForecastResult]:
        """
        Generate forecasts using LSTM.

        Uses Monte Carlo dropout for uncertainty estimation.
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")

        predictions = []
        current_sequence = self.last_sequence.copy()

        # Generate predictions step by step
        for _ in range(horizon):
            # Reshape for prediction
            X = current_sequence.reshape((1, self.sequence_length, 1))

            # Predict
            pred = self.model.predict(X, verbose=0)[0, 0]
            predictions.append(pred)

            # Update sequence
            current_sequence = np.roll(current_sequence, -1)
            current_sequence[-1] = pred

        # Inverse transform
        predictions = np.array(predictions).reshape(-1, 1)
        predictions = self.scaler.inverse_transform(predictions).flatten()

        # Generate confidence intervals using prediction uncertainty
        # Simple approach: use a percentage of prediction as uncertainty
        results = []
        start_time = datetime.now()

        for i, pred in enumerate(predictions):
            timestamp = start_time + timedelta(hours=i)
            uncertainty = pred * 0.1 * (1 + i * 0.02)  # Increasing uncertainty over time

            results.append(ForecastResult(
                timestamp=timestamp,
                prediction=max(0, pred),
                lower_bound=max(0, pred - 1.96 * uncertainty),
                upper_bound=max(0, pred + 1.96 * uncertainty),
                confidence_level=0.95
            ))

        return results

    def save(self, path: str) -> None:
        """Save model to disk."""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")

        # Save Keras model
        model_path = Path(path)
        keras_path = model_path.with_suffix('.keras')
        self.model.save(keras_path)

        # Save other components
        components = {
            'scaler': self.scaler,
            'last_sequence': self.last_sequence,
            'config': {
                'sequence_length': self.sequence_length,
                'hidden_units': self.hidden_units,
                'num_layers': self.num_layers,
                'dropout': self.dropout,
            },
            'metrics': self.metrics,
        }

        joblib.dump(components, path)
        logger.info(f"LSTM model saved to {path}")

    def load(self, path: str) -> 'LSTMModel':
        """Load model from disk."""
        from tensorflow.keras.models import load_model

        # Load components
        components = joblib.load(path)
        self.scaler = components['scaler']
        self.last_sequence = components['last_sequence']
        self.metrics = components.get('metrics')

        # Restore config
        config = components['config']
        self.sequence_length = config['sequence_length']
        self.hidden_units = config['hidden_units']
        self.num_layers = config['num_layers']
        self.dropout = config['dropout']

        # Load Keras model
        model_path = Path(path)
        keras_path = model_path.with_suffix('.keras')
        self.model = load_model(keras_path)

        self.is_fitted = True
        logger.info(f"LSTM model loaded from {path}")
        return self


class ExponentialSmoothingModel(BaseTimeSeriesModel):
    """
    Exponential Smoothing model for short-term forecasting.

    Good for:
    - Simple trend and seasonality patterns
    - Fast training and prediction
    - Interpretable results
    """

    def __init__(
        self,
        trend: str = 'add',
        seasonal: str = 'add',
        seasonal_periods: int = 24,
        damped_trend: bool = True
    ):
        """
        Initialize Exponential Smoothing model.

        Args:
            trend: Type of trend ('add', 'mul', None)
            seasonal: Type of seasonality ('add', 'mul', None)
            seasonal_periods: Number of periods in a season
            damped_trend: Whether to damp the trend
        """
        super().__init__("ExponentialSmoothing")
        self.trend = trend
        self.seasonal = seasonal
        self.seasonal_periods = seasonal_periods
        self.damped_trend = damped_trend

    def fit(
        self,
        data: pd.DataFrame,
        target_column: str = 'attendance'
    ) -> 'ExponentialSmoothingModel':
        """Fit Exponential Smoothing model."""
        try:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing
        except ImportError:
            logger.error("statsmodels not installed")
            raise

        y = data[target_column].values

        if len(y) < 2 * self.seasonal_periods:
            logger.warning("Limited data for seasonal model")
            self.seasonal = None

        self.model = ExponentialSmoothing(
            y,
            trend=self.trend,
            seasonal=self.seasonal,
            seasonal_periods=self.seasonal_periods,
            damped_trend=self.damped_trend
        )

        self.fitted_model = self.model.fit(optimized=True)
        self.is_fitted = True

        logger.info("Exponential Smoothing model fitted")
        return self

    def predict(
        self,
        horizon: int = 24,
        return_intervals: bool = True
    ) -> List[ForecastResult]:
        """Generate forecasts."""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")

        # Get point forecasts
        forecast = self.fitted_model.forecast(horizon)

        # Simple confidence intervals based on historical residuals
        residuals = self.fitted_model.resid
        std_error = np.std(residuals)

        results = []
        start_time = datetime.now()

        for i, pred in enumerate(forecast):
            timestamp = start_time + timedelta(hours=i)
            # Increasing uncertainty over horizon
            interval_width = 1.96 * std_error * np.sqrt(1 + i * 0.1)

            results.append(ForecastResult(
                timestamp=timestamp,
                prediction=max(0, pred),
                lower_bound=max(0, pred - interval_width),
                upper_bound=max(0, pred + interval_width),
                confidence_level=0.95
            ))

        return results

    def save(self, path: str) -> None:
        """Save model to disk."""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")

        model_data = {
            'fitted_model': self.fitted_model,
            'config': {
                'trend': self.trend,
                'seasonal': self.seasonal,
                'seasonal_periods': self.seasonal_periods,
                'damped_trend': self.damped_trend,
            },
            'metrics': self.metrics,
        }

        joblib.dump(model_data, path)
        logger.info(f"Exponential Smoothing model saved to {path}")

    def load(self, path: str) -> 'ExponentialSmoothingModel':
        """Load model from disk."""
        model_data = joblib.load(path)

        self.fitted_model = model_data['fitted_model']
        config = model_data['config']
        self.trend = config['trend']
        self.seasonal = config['seasonal']
        self.seasonal_periods = config['seasonal_periods']
        self.damped_trend = config['damped_trend']
        self.metrics = model_data.get('metrics')
        self.is_fitted = True

        logger.info(f"Exponential Smoothing model loaded from {path}")
        return self


def evaluate_model(
    model: BaseTimeSeriesModel,
    test_data: pd.DataFrame,
    target_column: str = 'attendance'
) -> ModelMetrics:
    """
    Evaluate time series model on test data.

    Args:
        model: Fitted time series model
        test_data: Test DataFrame
        target_column: Name of target column

    Returns:
        ModelMetrics with evaluation results
    """
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    # Generate predictions for test period
    predictions = model.predict(len(test_data))

    # Extract actual and predicted values
    actual = test_data[target_column].values
    predicted = np.array([p.prediction for p in predictions])
    lower = np.array([p.lower_bound for p in predictions])
    upper = np.array([p.upper_bound for p in predictions])

    # Calculate metrics
    mae = mean_absolute_error(actual, predicted)
    mape = np.mean(np.abs((actual - predicted) / (actual + 1e-10))) * 100
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    r2 = r2_score(actual, predicted)

    # Coverage: percentage of actual values within prediction interval
    in_interval = (actual >= lower) & (actual <= upper)
    coverage = np.mean(in_interval) * 100

    metrics = ModelMetrics(
        mae=mae,
        mape=mape,
        rmse=rmse,
        r2_score=r2,
        coverage=coverage
    )

    model.metrics = metrics
    return metrics
