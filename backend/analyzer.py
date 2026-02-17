import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import warnings

warnings.filterwarnings('ignore')

class AcademicAnalyzer:
    def __init__(self, df=None, semesters_df=None, subjects_df=None):
        if df is not None:
            self.semesters_df = df
        elif semesters_df is not None:
            self.semesters_df = semesters_df
        else:
            self.semesters_df = pd.DataFrame()
            
        self.subjects_df = subjects_df if subjects_df is not None else pd.DataFrame()

    def predict_next_sgpa(self):
        """
        Predict next semester SGPA using Linear Regression on previous semesters.
        """
        try:
            if self.semesters_df.empty or len(self.semesters_df) < 2:
                return None

            # Prepare data
            df = self.semesters_df.copy()
            # Ensure semantic order (1-1, 1-2, 2-1, etc.)
            df['sem_index'] = (df['year'] - 1) * 2 + df['sem']
            df = df.sort_values('sem_index')
            
            X = df['sem_index'].values.reshape(-1, 1)
            y = df['sgpa'].values
            
            # Simple Linear Regression
            model = LinearRegression()
            model.fit(X, y)
            
            next_sem_index = df['sem_index'].max() + 1
            prediction = model.predict([[next_sem_index]])[0]
            
            return round(min(max(prediction, 0.0), 10.0), 2)
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return None

    def get_insights(self):
        """
        Generate text insights based on performance trend.
        """
        insights = []
        try:
            if self.semesters_df.empty:
                return ["Not enough data for insights."]
                
            df = self.semesters_df.copy()
            df['sem_index'] = (df['year'] - 1) * 2 + df['sem']
            df = df.sort_values('sem_index')
            
            sgpas = df['sgpa'].values
            if len(sgpas) >= 2:
                recent = sgpas[-1]
                prev = sgpas[-2]
                diff = recent - prev
                
                if diff > 0.5:
                    insights.append(f"Great improvement! Your SGPA jumped by {diff:.2f}.")
                elif diff < -0.5:
                    insights.append(f"Your performance dipped by {abs(diff):.2f}. Focus on core subjects next sem.")
                elif diff > 0:
                    insights.append("Steady progress. Keep maintaining this consistency.")
                else:
                    insights.append("Performance is stable.")
                    
            avg_sgpa = sgpas.mean()
            if avg_sgpa > 8.5:
                insights.append("You are maintaining a distinction-level average!")
            elif avg_sgpa < 6.0:
                insights.append("Consider dedicating more time to fundamentals to boost your average.")
                
        except Exception:
            insights.append("Could not generate detailed insights.")
            
        return insights

    def analyze_performance(self):
        """
        Detailed performance stats for advanced analysis.
        """
        stats = {
            "average_sgpa": 0.0,
            "best_semester": None,
            "worst_semester": None,
            "trend": "Stable"
        }
        
        try:
            if not self.semesters_df.empty:
                stats["average_sgpa"] = round(self.semesters_df['sgpa'].mean(), 2)
                stats["best_semester"] = self.semesters_df.loc[self.semesters_df['sgpa'].idxmax()].to_dict()
                stats["worst_semester"] = self.semesters_df.loc[self.semesters_df['sgpa'].idxmin()].to_dict()
                
                # Trend
                if len(self.semesters_df) >= 2:
                    first = self.semesters_df.iloc[0]['sgpa']
                    last = self.semesters_df.iloc[-1]['sgpa']
                    if last > first + 0.5: stats['trend'] = 'Rising'
                    elif last < first - 0.5: stats['trend'] = 'Falling'
                    
        except Exception as e:
            print(f"Analysis error: {e}")
            
        return stats
