import React, { createContext, useState } from 'react';

export const RSVPContext = createContext();

export const RSVPProvider = ({ children }) => {
  // Email of the main contact person
  const [mainEmail, setMainEmail] = useState('');

  // Array of guests with individual details
  const [guests, setGuests] = useState([
    {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      ageGroup: '',       
      attendance: '',     
      allergies: [],      
      otherAllergy: '',   
      passport:"no" 
    },
  ]);

  // Array of passport image files
  const [passportImages, setPassportImages] = useState([]);

  // Submission state to prevent duplicate submissions
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Error message state to display feedback
  const [error, setError] = useState(null);

  // Loading state for async operations
  const [loading, setLoading] = useState(false);

  return (
    <RSVPContext.Provider
      value={{
        mainEmail,
        setMainEmail,
        guests,
        setGuests,
        passportImages,
        setPassportImages,
        isSubmitted,
        setIsSubmitted,
        error,
        setError,
        loading,
        setLoading,
      }}
    >
      {children}
    </RSVPContext.Provider>
  );
};
