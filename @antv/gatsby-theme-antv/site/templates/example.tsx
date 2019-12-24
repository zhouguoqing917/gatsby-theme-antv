import React, { useState } from 'react';
import { graphql, Link } from 'gatsby';
import { Layout as AntLayout, Menu, Icon, Tooltip } from 'antd';
import { groupBy } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import Drawer from 'rc-drawer';
import { useMedia } from 'react-use';
import Article from '../components/Article';
import SEO from '../components/Seo';
import Tabs from '../components/Tabs';
import PlayGrounds from '../components/PlayGrounds';
import NavigatorBanner from '../components/NavigatorBanner';
import { capitalize } from '../utils';
import styles from './markdown.module.less';

const MenuIcon = Icon.createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_470089_9m0keqj54r.js', // generated by iconfont.cn
});

const renderMenuItems = (edges: any[]) =>
  edges
    .filter((edge: any) => {
      const {
        node: {
          fields: { slug },
        },
      } = edge;
      if (slug.endsWith('/API') || slug.endsWith('/design')) {
        return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const {
        node: {
          frontmatter: { order: aOrder },
        },
      } = a;
      const {
        node: {
          frontmatter: { order: bOrder },
        },
      } = b;
      return aOrder - bOrder;
    })
    .map((edge: any) => {
      const {
        node: {
          frontmatter: { title, icon },
          fields: { slug },
        },
      } = edge;
      return (
        <Menu.Item key={slug}>
          <Link to={slug}>
            {icon && (
              <MenuIcon className={styles.menuIcon} type={`icon-${icon}`} />
            )}
            <span>{title}</span>
          </Link>
        </Menu.Item>
      );
    });

const getMenuItemLocaleKey = (slug = '') => {
  const slugPieces = slug.split('/');
  const menuItemLocaleKey = slugPieces
    .slice(slugPieces.indexOf('examples') + 1)
    .filter(key => key)
    .join('/');
  return menuItemLocaleKey;
};

const getExampleOrder = ({
  groupedEdgeKey = '',
  examples = [],
  groupedEdges = {},
}: {
  groupedEdgeKey: string;
  examples: any[];
  groupedEdges: {
    [key: string]: any[];
  };
}): number => {
  const key = getMenuItemLocaleKey(groupedEdgeKey);
  if (examples.find(item => item.slug === key)) {
    return (examples.findIndex(item => item.slug === key) || 0) + 100;
  }
  if (!groupedEdges[groupedEdgeKey] && !groupedEdges[groupedEdgeKey].length) {
    return 0;
  }
  return groupedEdges[groupedEdgeKey][0].node.frontmatter.order || 0;
};

export default function Template({
  data, // this prop will be injected by the GraphQL query below.
  location,
  pageContext,
}: {
  data: any;
  location: Location;
  pageContext: {
    prev: any;
    next: any;
    exampleSections: any;
    allDemos?: any[];
  };
}) {
  const { allMarkdownRemark, site } = data; // data.markdownRemark holds our post data
  const { edges = [] } = allMarkdownRemark;
  const edgesInExamples = edges.filter((item: any) =>
    item.node.fields.slug.includes('/examples/'),
  );
  const pathWithoutTrailingSlashes = location.pathname.replace(/\/$/, '');
  const { node: markdownRemark } =
    edgesInExamples.find((edge: any) => {
      const {
        fields: { slug },
      } = edge.node;
      if (
        /\/examples\/.*\/API$/.test(pathWithoutTrailingSlashes) ||
        /\/examples\/.*\/design$/.test(pathWithoutTrailingSlashes)
      ) {
        return pathWithoutTrailingSlashes.indexOf(slug) >= 0;
      }
      return (
        pathWithoutTrailingSlashes === slug ||
        pathWithoutTrailingSlashes.endsWith(slug)
      );
    }) || {};
  if (!markdownRemark) {
    return null;
  }
  const {
    frontmatter,
    html,
    fields: { slug },
    parent: { relativePath },
  } = markdownRemark;
  const {
    siteMetadata: { examples = [], githubUrl, playground },
  } = site;
  const { t, i18n } = useTranslation();
  const groupedEdges = groupBy(
    edgesInExamples,
    ({
      node: {
        fields: { slug: slugString },
      },
    }: any) => {
      // API.md and deisgn.md
      if (slugString.endsWith('/API') || slugString.endsWith('/design')) {
        return slugString
          .split('/')
          .slice(0, -2)
          .join('/');
      }
      // index.md
      return slugString
        .split('/')
        .slice(0, -1)
        .join('/');
    },
  );
  const defaultOpenKeys = Object.keys(groupedEdges).filter(key =>
    slug.startsWith(key),
  );
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys);
  let activeTab = 'examples' as 'examples' | 'API' | 'design';
  let exampleRootSlug = slug;
  if (/\/examples\/.*\/API$/.test(pathWithoutTrailingSlashes)) {
    activeTab = 'API';
    exampleRootSlug = exampleRootSlug.replace(/\/API$/, '');
  } else if (/\/examples\/.*\/design$/.test(pathWithoutTrailingSlashes)) {
    activeTab = 'design';
    exampleRootSlug = exampleRootSlug.replace(/\/design$/, '');
  }
  const { exampleSections = {}, prev, next, allDemos = [] } = pageContext;

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[slug]}
      style={{ height: '100%' }}
      openKeys={openKeys}
      onOpenChange={currentOpenKeys => setOpenKeys(currentOpenKeys)}
      forceSubMenuRender
    >
      {Object.keys(groupedEdges)
        .filter(key => key.startsWith(`/${i18n.language}/`))
        .sort((a: string, b: string) => {
          const aOrder = getExampleOrder({
            groupedEdgeKey: a,
            examples,
            groupedEdges,
          });
          const bOrder = getExampleOrder({
            groupedEdgeKey: b,
            examples,
            groupedEdges,
          });
          return aOrder - bOrder;
        })
        .map(slugString => {
          const slugPieces = slugString.split('/');
          if (slugPieces.length <= 3) {
            return renderMenuItems(groupedEdges[slugString]);
          }
          const menuItemLocaleKey = getMenuItemLocaleKey(slugString);
          const doc =
            examples.find((item: any) => item.slug === menuItemLocaleKey) || {};
          return (
            <Menu.SubMenu
              key={slugString}
              title={
                <div>
                  {doc.icon && (
                    <MenuIcon
                      className={styles.menuIcon}
                      type={`icon-${doc.icon}`}
                    />
                  )}
                  <span>
                    {doc && doc.title
                      ? capitalize(doc.title[i18n.language])
                      : menuItemLocaleKey}
                  </span>
                </div>
              }
            >
              {renderMenuItems(groupedEdges[slugString])}
            </Menu.SubMenu>
          );
        })}
    </Menu>
  );

  const isWide = useMedia('(min-width: 767.99px)', true);
  const [drawOpen, setDrawOpen] = useState(false);
  const menuSider = isWide ? (
    <AntLayout.Sider width="auto" theme="light" className={styles.sider}>
      {menu}
    </AntLayout.Sider>
  ) : (
    <Drawer
      handler={
        <Icon
          className={styles.menuSwitch}
          type={drawOpen ? 'menu-fold' : 'menu-unfold'}
        />
      }
      wrapperClassName={styles.menuDrawer}
      onChange={open => setDrawOpen(!!open)}
      width={280}
    >
      {menu}
    </Drawer>
  );

  const gallaryPageContent = (
    <>
      <h1>{frontmatter.title}</h1>
      <div
        /* eslint-disable-next-line react/no-danger */
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ul className={styles.gallery}>
        {allDemos.map(demo => {
          const cardTitle = demo.title
            ? demo.title[i18n.language]
            : demo.filename;
          const demoSlug = demo.relativePath.replace(
            /\/demo\/(.*)\..*/,
            (_: string, filename: string) => {
              return `#${filename}`;
            },
          );
          return (
            <li className={styles.galleryCard} key={demo.relativePath}>
              <Link
                to={`${i18n.language}/examples/${demoSlug}`}
                className={styles.galleryCardLink}
              >
                <img
                  src={
                    demo.screenshot ||
                    'https://gw.alipayobjects.com/os/s/prod/antv/assets/image/screenshot-placeholder-b8e70.png'
                  }
                  alt={cardTitle}
                />
                <h4>{cardTitle}</h4>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  const exmaplePageContent = (
    <>
      <h1>
        {frontmatter.title}
        <Tooltip title={t('在 GitHub 上编辑')}>
          <a
            href={`${githubUrl}/edit/master/examples/${relativePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.editOnGtiHubButton}
          >
            <Icon type="edit" />
          </a>
        </Tooltip>
      </h1>
      <div
        /* eslint-disable-next-line react/no-danger */
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Tabs
        slug={exampleRootSlug}
        active={activeTab}
        showTabs={{
          examples:
            exampleSections.examples && exampleSections.examples.length > 0,
          API: !!exampleSections.API,
          design: !!exampleSections.design,
        }}
        examplesCount={(exampleSections.examples || []).length}
      />
      {exampleSections.examples && (
        <div style={{ display: activeTab === 'examples' ? 'block' : 'none' }}>
          <PlayGrounds
            examples={exampleSections.examples}
            location={location}
            playground={playground || {}}
          />
        </div>
      )}
      {exampleSections.API && (
        <div
          style={{ display: activeTab === 'API' ? 'block' : 'none' }}
          /* eslint-disable-next-line react/no-danger */
          dangerouslySetInnerHTML={{
            __html: exampleSections.API.node.html,
          }}
        />
      )}
      {exampleSections.design && (
        <div
          style={{ display: activeTab === 'design' ? 'block' : 'none' }}
          /* eslint-disable-next-line react/no-danger */
          dangerouslySetInnerHTML={{
            __html: exampleSections.design.node.html,
          }}
        />
      )}
      <div>
        <NavigatorBanner type="prev" post={prev} />
        <NavigatorBanner type="next" post={next} />
      </div>
    </>
  );

  return (
    <>
      <SEO title={frontmatter.title} lang={i18n.language} />
      <AntLayout
        style={{ background: '#fff' }}
        hasSider
        className={styles.layout}
      >
        {menuSider}
        <Article className={styles.markdown}>
          <div className={styles.main} style={{ width: '100%' }}>
            {pathWithoutTrailingSlashes.includes('/examples/gallary')
              ? gallaryPageContent
              : exmaplePageContent}
          </div>
        </Article>
      </AntLayout>
    </>
  );
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
        githubUrl
        examples {
          slug
          icon
          title {
            zh
            en
          }
        }
        playground {
          container
          playgroundDidMount
          playgroundWillUnmount
          dependencies
          htmlCodeTemplate
        }
      }
      pathPrefix
    }
    allMarkdownRemark(
      sort: { order: ASC, fields: [frontmatter___order] }
      limit: 1000
    ) {
      edges {
        node {
          html
          fields {
            slug
          }
          frontmatter {
            title
            order
            icon
          }
          parent {
            ... on File {
              relativePath
            }
          }
        }
      }
    }
  }
`;
