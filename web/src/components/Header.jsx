import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BASE_URL, getToken } from "../config";
import { Link } from 'react-router-dom';

// MUI Imports
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import { styled, alpha } from '@mui/material/styles'; // For custom search bar styling
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
const token = getToken(); // Get the token for authentication
// Styled Search component
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
  // Hide on mobile (xs and sm breakpoints)
  [theme.breakpoints.down('md')]: { // Hide for screens smaller than 'md'
    display: 'none',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const UserHeader = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const logo = '/uploads/vicinity_logo.png';

  const [anchorEl, setAnchorEl] = useState(null); // State for dropdown menu anchor
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

const handleLogout = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      localStorage.removeItem('accessToken');
      setUser(null);
      navigate('/login');
    }
  } catch (err) {
    console.error('Logout failed', err);
  } finally {
    handleClose();
  }
};


  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        {/* Logo */}
        <Link to="/feeds" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src={logo} alt="Vicinity Logo" style={{ maxWidth: '120px', display: 'block' }} />
        </Link>

        {/* Spacer to push items to the right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Search Bar (hidden on mobile) */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search nearby…"
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>

        {/* Chat Icon (optional, always visible) */}
        <IconButton color="inherit" sx={{ display: { xs: 'block', sm: 'block', md: 'none' } }}>
          <ChatBubbleOutlineIcon />
        </IconButton>

        {/* Profile Pic with Dropdown */}
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
          sx={{ marginLeft: { xs: 0, md: 2 } }} // Adjust margin based on screen size
        >
          <Avatar alt={user?.name || 'User'} src={user?.profilePic} />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={open}
          onClose={handleClose}
        >
          <MenuItem onClick={handleClose} component={Link} to="/profile">Profile</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default UserHeader;