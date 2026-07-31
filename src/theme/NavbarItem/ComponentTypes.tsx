import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import LocaleNavbarItem from '@theme/NavbarItem/LocaleNavbarItem';

// 在默认类型基础上注册自定义的 custom-locale-navbar-item 类型
// 注意:Docusaurus schema 要求自定义类型必须以 'custom-' 开头
const CustomComponentTypes = {
  ...ComponentTypes,
  'custom-locale-navbar-item': LocaleNavbarItem,
};

export default CustomComponentTypes;
