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
        Returns consistency_score, grade_stability, and dominant_grade
        as expected by the frontend SubjectInsights component.
        """
        stats = {
            "consistency_score": 0,
            "grade_stability": "N/A",
            "dominant_grade": "N/A",
            "average_sgpa": 0.0,
            "trend": "Stable"
        }
        
        try:
            if not self.semesters_df.empty:
                sgpas = self.semesters_df['sgpa'].values
                valid_sgpas = sgpas[sgpas > 0]
                
                if len(valid_sgpas) > 0:
                    stats["average_sgpa"] = round(float(np.mean(valid_sgpas)), 2)
                    
                    # Consistency score: 100 - (std_dev * 10), clamped to 0-100
                    if len(valid_sgpas) >= 2:
                        std_dev = float(np.std(valid_sgpas))
                        consistency = max(0, min(100, round(100 - std_dev * 20)))
                        stats["consistency_score"] = consistency
                        
                        # Grade stability based on consistency
                        if consistency >= 85:
                            stats["grade_stability"] = "Very Stable"
                        elif consistency >= 70:
                            stats["grade_stability"] = "Stable"
                        elif consistency >= 50:
                            stats["grade_stability"] = "Moderate"
                        else:
                            stats["grade_stability"] = "Volatile"
                        
                        # Trend
                        first = float(valid_sgpas[0])
                        last = float(valid_sgpas[-1])
                        if last > first + 0.5: stats['trend'] = 'Rising'
                        elif last < first - 0.5: stats['trend'] = 'Falling'
                    else:
                        stats["consistency_score"] = 100
                        stats["grade_stability"] = "N/A"
            
            # Dominant grade from subjects
            if not self.subjects_df.empty and 'grade' in self.subjects_df.columns:
                grade_counts = self.subjects_df['grade'].value_counts()
                if len(grade_counts) > 0:
                    stats["dominant_grade"] = str(grade_counts.index[0])
                    
        except Exception as e:
            print(f"Analysis error: {e}")
            
        return stats

