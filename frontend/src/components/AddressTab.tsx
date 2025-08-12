import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  CircularProgress
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Business as BusinessIcon,
  LocationCity as LocationCityIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { addressAPI } from '../utils/apiClient';

interface AddressTabProps {
  location?: string;
  onCopyToClipboard: (content: string, type: string) => void;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipcode: string;
}

const AddressTab: React.FC<AddressTabProps> = ({ location, onCopyToClipboard }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualState, setManualState] = useState<string>('');
  const [manualStateError, setManualStateError] = useState<string | null>(null);

  // US states mapping
  const states = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
  };

  const getStateFromLocation = (loc: string): string | null => {
    if (!loc) return null;
    
    const generic_locations = [
      "open to relocation", "remote", "none", "n/a", "not specified", 
      "flexible", "anywhere", "worldwide", "global"
    ];
    
    const location_lower = loc.toLowerCase().trim();
    if (generic_locations.some(generic => location_lower.includes(generic))) {
      return null;
    }
    
    const location_upper = loc.toUpperCase().trim();
    
    if (location_upper.includes(',')) {
      const parts = location_upper.split(',');
      if (parts.length >= 2) {
        const last_part = parts[parts.length - 1].trim();
        if (states[last_part]) {
          return last_part;
        }
      }
    }
    
    const words = location_upper.split(' ');
    if (words.length >= 2) {
      const last_word = words[words.length - 1];
      if (states[last_word]) {
        return last_word;
      }
    }
    
    return null;
  };

  const isGenericLocation = (loc: string): boolean => {
    if (!loc) return false;
    
    const generic_locations = [
      "open to relocation", "remote", "none", "n/a", "not specified", 
      "flexible", "anywhere", "worldwide", "global"
    ];
    
    const location_lower = loc.toLowerCase().trim();
    return generic_locations.some(generic => location_lower.includes(generic));
  };

  const detectedState = getStateFromLocation(location || '');
  const isGeneric = isGenericLocation(location || '');
  const showFindAddressesButton = !!detectedState;
  const showManualStateInput = isGeneric && !detectedState;

  const handleFindAddresses = async () => {
    if (!detectedState) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await addressAPI.findAddresses(location || '');
      
      if (data.success) {
        setAddresses(data.addresses);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError('Failed to fetch addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualStateSubmit = async () => {
    if (!manualState || manualState.length !== 2) {
      setManualStateError('Please enter a valid 2-character state abbreviation');
      return;
    }

    const stateUpper = manualState.toUpperCase().trim();
    
    if (!states[stateUpper]) {
      setManualStateError(`Invalid state abbreviation. Please use a valid US state code like TX, CA, NY, etc.`);
      return;
    }

    setManualStateError(null);
    setLoading(true);
    setError(null);
    
    try {
      const data = await addressAPI.findAddresses(stateUpper);
      
      if (data.success) {
        setAddresses(data.addresses);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError('Failed to fetch addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper 
      elevation={4}
      sx={{ 
        p: 2, 
        background: 'rgba(15, 23, 42, 0.4)',
        flex: 1,
        overflow: 'auto',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 2,
        backdropFilter: 'blur(5px)',
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(15, 23, 42, 0.3)',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(99, 102, 241, 0.3)',
          borderRadius: '4px',
          '&:hover': {
            background: 'rgba(99, 102, 241, 0.5)'
          }
        }
      }}
    >
               <IconButton
           onClick={() => {
             const addressContent = `Location Information\n\nLocation: ${location || 'N/A'}`;
             onCopyToClipboard(addressContent, 'Location Information');
           }}
           sx={{
             position: 'absolute',
             top: 8,
             right: 8,
             color: '#6366F1',
             backgroundColor: 'rgba(99, 102, 241, 0.1)',
             '&:hover': {
               backgroundColor: 'rgba(99, 102, 241, 0.2)',
               transform: 'scale(1.05)'
             },
             transition: 'all 0.2s ease-in-out'
           }}
           size="small"
         >
           <CopyIcon sx={{ fontSize: '1rem' }} />
         </IconButton>
      
      <Box sx={{ pr: 4 }}>
                 <Typography variant="h6" sx={{ 
           fontWeight: 600,
           color: '#6366F1',
           mb: 2,
           fontSize: '1.1rem',
           display: 'flex',
           alignItems: 'center',
           gap: 1
         }}>
           <LocationCityIcon sx={{ fontSize: '1.1rem' }} />
           Location Information
         </Typography>
        
                 <Paper sx={{ 
           p: 2, 
           background: 'rgba(15, 23, 42, 0.6)',
           border: '1px solid rgba(99, 102, 241, 0.1)',
           borderRadius: 2,
         }}>
           {!isGeneric && (
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
               <Typography variant="body1" sx={{ 
                 color: '#E2E8F0',
                 fontSize: '1rem',
                 fontWeight: 700
               }}>
                 {location || 'Not available'}
               </Typography>
               {showFindAddressesButton && (
                 <Button
                   variant="contained"
                   size="small"
                   onClick={handleFindAddresses}
                   disabled={loading}
                   startIcon={loading ? <CircularProgress size={16} /> : <BusinessIcon />}
                   sx={{
                     background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                     '&:hover': {
                       background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                       transform: 'translateY(-1px)'
                     },
                     '&:disabled': {
                       background: 'rgba(16, 185, 129, 0.3)',
                     },
                     transition: 'all 0.3s ease',
                     px: 2,
                     py: 0.5,
                     fontSize: '0.75rem',
                     minWidth: '120px'
                   }}
                 >
                   {loading ? 'Finding...' : `Find ${detectedState} Addresses`}
                 </Button>
               )}
             </Box>
           )}
           
           {showManualStateInput && (
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                 <Typography variant="body2" sx={{ 
                   color: '#94A3B8',
                   fontSize: '0.8rem',
                   fontStyle: 'italic'
                 }}>
                   Need a Random address? Just add the state and voilà! ✨
                 </Typography>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   <input
                     type="text"
                     value={manualState}
                     onChange={(e) => {
                       const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                       setManualState(value);
                       setManualStateError(null);
                     }}
                     placeholder="TX"
                     maxLength={2}
                     style={{
                       width: '80px',
                       padding: '10px 12px',
                       border: manualStateError ? '1px solid #EF4444' : '1px solid rgba(99, 102, 241, 0.4)',
                       borderRadius: '6px',
                       backgroundColor: 'rgba(15, 23, 42, 0.9)',
                       color: '#E2E8F0',
                       fontSize: '0.9rem',
                       textAlign: 'center',
                       outline: 'none',
                       fontWeight: '600'
                     }}
                   />
                 </Box>
               </Box>
               <Button
                 variant="contained"
                 size="small"
                 onClick={handleManualStateSubmit}
                 disabled={loading || !manualState}
                 startIcon={loading ? <CircularProgress size={16} /> : <BusinessIcon />}
                 sx={{
                   background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                   '&:hover': {
                     background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                     transform: 'translateY(-1px)'
                   },
                   '&:disabled': {
                     background: 'rgba(16, 185, 129, 0.3)',
                   },
                   transition: 'all 0.3s ease',
                   px: 3,
                   py: 1,
                   fontSize: '0.8rem',
                   minWidth: '120px',
                   height: '40px'
                 }}
               >
                 {loading ? 'Finding...' : `Find Addresses`}
               </Button>
             </Box>
           )}
           
           {manualStateError && (
             <Typography variant="body2" sx={{ 
               color: '#EF4444',
               fontSize: '0.75rem',
               mt: 1,
               textAlign: 'center'
             }}>
               ❌ {manualStateError}
             </Typography>
           )}
         </Paper>

        

         {addresses.length > 0 && (
           <Box sx={{ mt: 3 }}>
             <Typography variant="h6" sx={{ 
               fontWeight: 600,
               color: '#10B981',
               mb: 2,
               fontSize: '1rem',
               display: 'flex',
               alignItems: 'center',
               gap: 1
             }}>
               <BusinessIcon sx={{ fontSize: '1rem' }} />
               Found Addresses ({addresses.length})
             </Typography>
             <Box sx={{ 
               display: 'grid', 
               gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
               gap: 2,
               mt: 2
             }}>
               {addresses.map((address, index) => (
                 <Paper key={index} sx={{ 
                   p: 1.5, 
                   background: 'rgba(15, 23, 42, 0.6)',
                   border: '1px solid rgba(16, 185, 129, 0.2)',
                   borderRadius: 2,
                   position: 'relative',
                   '&:hover': {
                     border: '1px solid rgba(16, 185, 129, 0.4)',
                     transform: 'translateY(-1px)',
                     transition: 'all 0.2s ease'
                   }
                 }}>
                   {/* Address number badge */}
                   <Box sx={{
                     position: 'absolute',
                     top: -8,
                     left: 12,
                     backgroundColor: '#10B981',
                     color: 'white',
                     borderRadius: '50%',
                     width: 24,
                     height: 24,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     fontSize: '0.7rem',
                     fontWeight: 600,
                     border: '2px solid rgba(15, 23, 42, 0.8)'
                   }}>
                     {index + 1}
                   </Box>
                   
                   {/* Street address */}
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
                     <HomeIcon sx={{ fontSize: '0.9rem', color: '#10B981' }} />
                     <Typography variant="body2" sx={{ 
                       color: '#E2E8F0',
                       fontSize: '0.8rem',
                       fontWeight: 500,
                       flex: 1
                     }}>
                       {address.street}
                     </Typography>
                     <IconButton
                       size="small"
                       onClick={() => onCopyToClipboard(address.street, 'Street Address')}
                       sx={{
                         color: '#10B981',
                         p: 0.5,
                         '&:hover': {
                           backgroundColor: 'rgba(16, 185, 129, 0.1)',
                           transform: 'scale(1.1)'
                         },
                         transition: 'all 0.2s ease'
                       }}
                     >
                       <CopyIcon sx={{ fontSize: '0.8rem' }} />
                     </IconButton>
                   </Box>
                   
                   {/* City, State, Zip */}
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <LocationCityIcon sx={{ fontSize: '0.9rem', color: '#6366F1' }} />
                     <Typography variant="body2" sx={{ 
                       color: '#94A3B8',
                       fontSize: '0.75rem',
                       flex: 1
                     }}>
                       {address.city}, {address.state} {address.zipcode}
                     </Typography>
                     <IconButton
                       size="small"
                       onClick={() => onCopyToClipboard(`${address.city}, ${address.state} ${address.zipcode}`, 'City State Zip')}
                       sx={{
                         color: '#6366F1',
                         p: 0.5,
                         '&:hover': {
                           backgroundColor: 'rgba(99, 102, 241, 0.1)',
                           transform: 'scale(1.1)'
                         },
                         transition: 'all 0.2s ease'
                       }}
                     >
                       <CopyIcon sx={{ fontSize: '0.8rem' }} />
                     </IconButton>
                   </Box>
                 </Paper>
               ))}
             </Box>
           </Box>
         )}


        {error && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ 
              color: '#EF4444',
              fontSize: '0.8rem',
              textAlign: 'center',
              p: 1,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              ❌ {error}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AddressTab;
