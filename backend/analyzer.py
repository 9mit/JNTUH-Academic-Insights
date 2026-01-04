import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import Dict, List, Optional, Tuple

class AcademicAnalyzer:
    def __init__(self, semesters_df: pd.DataFrame, subjects_df: pd.DataFrame = None):
        self.df = semesters_df
        self.subjects_df = subjects_df if subjects_df is not None else pd.DataFrame()
        
    def analyze_performance(self) -> Dict:
        """
        Advanced analysis using Numpy/Pandas
        """
        stats = {
            'consistency_score': 0, 
            'grade_stability': 'Unknown',
            'dominant_grade': 'N/A',
            'grade_points_mean': 0.0,
            'grade_points_std': 0.0
        }
        
        if self.subjects_df.empty:
            return stats
            
        # 1. Calculate Grade Statistics
        gp_mean = self.subjects_df['grade_points'].mean()
        gp_std = self.subjects_df['grade_points'].std()
        
        # 2. Consistency Score (0-100)
        # Based on Coefficient of Variation (CV) = StdDev / Mean
        # Lower CV is better. If Mean is 0, score is 0.
        if gp_mean > 0:
            cv = gp_std / gp_mean
            # Map CV to score: CV 0.0 -> 100, CV 0.5 -> 0
            raw_score = 100 * (1 - (cv / 0.5))
            stats['consistency_score'] = max(0, min(100, round(raw_score)))
        
        # 3. Grade Stability Text
        if gp_std < 0.5: stats['grade_stability'] = 'Very High'
        elif gp_std < 1.0: stats['grade_stability'] = 'High'
        elif gp_std < 1.5: stats['grade_stability'] = 'Moderate'
        else: stats['grade_stability'] = 'Volatile'
        
        # 4. Dominant Grade (Mode)
        try:
            stats['dominant_grade'] = self.subjects_df['grade'].mode()[0]
        except:
            pass
            
        stats['grade_points_mean'] = round(gp_mean, 2)
        stats['grade_points_std'] = round(gp_std, 2)
        
        return stats

    def predict_next_sgpa(self) -> Dict:
        """
        Predict next semester SGPA using Linear Regression
        """
        if len(self.df) < 2:
            return {
                'predicted_sgpa': None,
                'confidence': 0,
                'message': "Need at least 2 semesters of data for prediction"
            }
            
        # Prepare data
        # X = Semester index (0, 1, 2...), Y = SGPA
        X = np.arange(len(self.df)).reshape(-1, 1)
        y = self.df['sgpa'].values
        
        # Train model
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict next index
        next_index = np.array([[len(self.df)]])
        predicted_sgpa = model.predict(next_index)[0]
        
        # Clip to valid range 0-10
        predicted_sgpa = max(0, min(10, predicted_sgpa))
        
        # Calculate slope/trend
        slope = model.coef_[0]
        
        return {
            'predicted_sgpa': round(predicted_sgpa, 2),
            'slope': round(slope, 3),
            'trend': 'Increasing' if slope > 0.1 else 'Decreasing' if slope < -0.1 else 'Stable'
        }
        
    def calculate_target_cgpa(self, current_cgpa: float, total_completed_credits: float, 
                              target_cgpa: float, remaining_semesters: int = 1,
                              credits_per_sem: int = 21) -> Dict:
        """
        Calculate required SGPA to achieve target CGPA
        """
        future_credits = remaining_semesters * credits_per_sem
        total_credits = total_completed_credits + future_credits
        
        required_total_points = target_cgpa * total_credits
        current_points = current_cgpa * total_completed_credits
        
        needed_points = required_total_points - current_points
        required_sgpa = needed_points / future_credits
        
        achievable = 0 <= required_sgpa <= 10
        
        return {
            'required_sgpa': round(required_sgpa, 2),
            'achievable': achievable,
            'message': (f"You need ~{round(required_sgpa, 2)} SGPA in remaining semesters" 
                        if achievable else "Target is mathematically impossible with standard credits")
        }
        
    def get_insights(self) -> List[Dict]:
        """
        Generate heuristic insights based on data
        """
        insights = []
        if self.df.empty:
            return insights
            
        # Volatility
        if len(self.df) >= 3:
            std_dev = self.df['sgpa'].std()
            if std_dev > 1.0:
                insights.append({
                    'type': 'warning',
                    'text': f"High volatility detected (Std Dev: {std_dev:.2f}). Performance is inconsistent."
                })
            elif std_dev < 0.3:
                insights.append({
                    'type': 'success',
                    'text': "Consistent performance! Your SGPA is very stable."
                })
                
        # Latest Performance
        if len(self.df) >= 2:
            latest = self.df.iloc[-1]['sgpa']
            prev = self.df.iloc[-2]['sgpa']
            diff = latest - prev
            
            if diff >= 0.5:
                insights.append({
                    'type': 'success',
                    'text': f"Great improvement! SGPA increased by {diff:.2f} compared to last semester."
                })
            elif diff <= -0.5:
                insights.append({
                    'type': 'error',
                    'text': f"Performance drop detected. SGPA decreased by {abs(diff):.2f}."
                })
                
        return insights
