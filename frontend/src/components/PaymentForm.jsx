import React, { useState } from 'react';
import { CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';

const PaymentForm = ({ onPaymentMethodReady, disabled = false, isDark = true }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errors, setErrors] = useState({});
    const [cardComplete, setCardComplete] = useState({
        cardNumber: false,
        cardExpiry: false,
        cardCvc: false
    });

    const textColor   = isDark ? '#ffffff' : '#111827';
    const placeholder = isDark ? '#9ca3af' : '#6b7280';

    const elementStyle = {
        base: {
            fontSize: '16px',
            color: textColor,
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            '::placeholder': { color: placeholder },
            iconColor: '#a855f7',
        },
        invalid:  { color: '#ef4444', iconColor: '#ef4444' },
        complete: { color: '#10b981', iconColor: '#10b981' }
    };

    // showIcon solo funciona en CardNumberElement
    const cardNumberOptions = { style: elementStyle, showIcon: true };
    const cardFieldOptions  = { style: elementStyle };

    const handleChange = (elementType) => (event) => {
        setCardComplete(prev => ({
            ...prev,
            [elementType]: event.complete
        }));

        if (event.error) {
            setErrors(prev => ({
                ...prev,
                [elementType]: event.error.message
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[elementType];
                return newErrors;
            });
        }

        // avisamos al componente padre cuando todos los campos están completos
        const allComplete = elementType === 'cardNumber'
            ? event.complete && cardComplete.cardExpiry && cardComplete.cardCvc
            : elementType === 'cardExpiry'
                ? cardComplete.cardNumber && event.complete && cardComplete.cardCvc
                : cardComplete.cardNumber && cardComplete.cardExpiry && event.complete;

        if (allComplete && onPaymentMethodReady) {
            onPaymentMethodReady(true);
        } else if (onPaymentMethodReady) {
            onPaymentMethodReady(false);
        }
    };

    const isComplete = cardComplete.cardNumber && cardComplete.cardExpiry && cardComplete.cardCvc;

    return (
        <div className="space-y-4">
            {/* número de tarjeta */}
            <div className="relative group/input">
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                    Card Number
                </label>
                <div className={`
          bg-white/5 border rounded-xl px-4 py-3.5 backdrop-blur-sm
          transition-all duration-300
          ${errors.cardNumber ? 'border-red-500/50' : 'border-purple-500/30'}
          ${cardComplete.cardNumber ? 'border-green-500/50' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-500/50'}
        `}>
                    <CardNumberElement
                        options={cardNumberOptions}
                        onChange={handleChange('cardNumber')}
                        disabled={disabled}
                    />
                </div>
                {errors.cardNumber && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.cardNumber}
                    </p>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover/input:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
            </div>

            {/* caducidad y CVC */}
            <div className="grid grid-cols-2 gap-4">
                {/* fecha de caducidad */}
                <div className="relative group/input">
                    <label className="block text-gray-300 mb-2 text-sm font-medium">
                        Expiry Date
                    </label>
                    <div className={`
            bg-white/5 border rounded-xl px-4 py-3.5 backdrop-blur-sm
            transition-all duration-300
            ${errors.cardExpiry ? 'border-red-500/50' : 'border-cyan-500/30'}
            ${cardComplete.cardExpiry ? 'border-green-500/50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500/50'}
          `}>
                        <CardExpiryElement
                            options={cardFieldOptions}
                            onChange={handleChange('cardExpiry')}
                            disabled={disabled}
                        />
                    </div>
                    {errors.cardExpiry && (
                        <p className="text-red-400 text-xs mt-1">{errors.cardExpiry}</p>
                    )}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover/input:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
                </div>

                {/* código CVC */}
                <div className="relative group/input">
                    <label className="block text-gray-300 mb-2 text-sm font-medium">
                        CVC
                    </label>
                    <div className={`
            bg-white/5 border rounded-xl px-4 py-3.5 backdrop-blur-sm
            transition-all duration-300
            ${errors.cardCvc ? 'border-red-500/50' : 'border-cyan-500/30'}
            ${cardComplete.cardCvc ? 'border-green-500/50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500/50'}
          `}>
                        <CardCvcElement
                            options={cardFieldOptions}
                            onChange={handleChange('cardCvc')}
                            disabled={disabled}
                        />
                    </div>
                    {errors.cardCvc && (
                        <p className="text-red-400 text-xs mt-1">{errors.cardCvc}</p>
                    )}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover/input:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
                </div>
            </div>

            {/* aviso de pago seguro */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-xs text-green-300">
                    <p className="font-semibold mb-1">Pago seguro</p>
                    <p className="text-green-400/80">Tu información de pago está cifrada y procesada de forma segura por Stripe. Nunca guardamos los datos de tu tarjeta.</p>
                </div>
            </div>

            {/* tarjetas de prueba (solo en desarrollo) */}
            {import.meta.env.DEV && (
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-300 font-semibold mb-2">🧪 Modo test - usa estas tarjetas de prueba:</p>
                    <div className="space-y-1 text-xs text-blue-400/80">
                        <p>✅ Éxito: <code className="bg-blue-500/20 px-1 rounded">4242 4242 4242 4242</code></p>
                        <p>❌ Rechazada: <code className="bg-blue-500/20 px-1 rounded">4000 0000 0000 0002</code></p>
                        <p className="text-blue-500/60">Cualquier fecha futura para caducidad, cualquier 3 dígitos para el CVC</p>
                    </div>
                </div>
            )}

            {/* estado de completado */}
            {isComplete && !disabled && (
                <div className="flex items-center gap-2 text-green-400 text-sm animate-fade-in">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Datos de tarjeta completos</span>
                </div>
            )}
        </div>
    );
};

export default PaymentForm;
