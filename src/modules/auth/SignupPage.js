import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../core/context/AuthContext';
import './SignupPage.css';

const SignupPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await register(formData.name, formData.email, formData.password, formData.phone);

        if (result.success) {
            if (result.pendingApproval) {
                // Show success message and don't navigate to dashboard
                setSuccess(true);
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.message);
        }

        setLoading(false);
    };

    return (
        <div className="signup-container">
            <div className="signup-wrapper">
                {success ? (
                    <div className="signup-success">
                        <div className="success-icon">✅</div>
                        <h1 className="signup-title">Registration Successful!</h1>
                        <p className="signup-subtitle">
                            Thank you for joining Delhiveryway! Your account has been created and is currently <strong>awaiting admin approval</strong>.
                        </p>
                        <p className="signup-description">
                            Our team will review your application shortly. Once approved, you will be able to sign in and start shopping.
                        </p>
                        <Link to="/login" className="signup-button" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                            Go to Login
                        </Link>
                    </div>
                ) : (
                    <form className="signup-form" onSubmit={handleSubmit}>
                        <h1 className="signup-title">Join as Personal Shopper</h1>
                        <p className="signup-subtitle">Start earning by shopping for customers</p>

                        {error && <div className="error-message">{error}</div>}

                        <div className="input-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength="6"
                            />
                        </div>

                        <button
                            type="submit"
                            className="signup-button"
                            disabled={loading}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>

                        <div className="login-link">
                            Already have an account? <Link to="/login">Sign in</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SignupPage;
