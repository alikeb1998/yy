import React, {FunctionComponent, useEffect} from 'react';
import {useState} from 'react';
import {useSelector} from 'react-redux';
import {useHistory} from 'react-router-dom';
import {useTextSelection} from 'use-text-selection';
import ReactHtmlParser, {convertNodeToElement, Transform} from 'react-html-parser';
import {Popover} from 'react-text-selection-popover';
import styled, {css} from 'styled-components';

import {BackHome, ChapterController, ChaptersMenu, Page, SelectStyle} from '../components';
import {RootState} from '../store';
import {Color} from '../store/settings/types';
import {useWindowSize} from '../hooks';

interface ContainerProps {
	background: Color;
}

const Container = styled.div<ContainerProps>`
  background: ${({background}) => background};
	width: 100vw;
	height: 100vh;
`;

const SelectStyleContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  transition: all 336ms;
  z-index: 2;
`;

const BackHomeContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  transition: all 336ms;
  z-index: 2;
`;

const ChaptersMenuContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transition: all 336ms;
  transform: translateX(-50%);
  z-index: 2;
`;

interface ContentContainerProps {
	background: Color;
	height: number;
	color: Color;
	fontSize: number;
}

const ContentContainer = styled.div<ContentContainerProps>`
  background: ${({background}) => background};
  position: fixed;
	top: 80px;
	right: 20px;
	left: 20px;
  height: ${({height}) => height}px;
  background: ${({background}) => background};
  transition: all 336ms;
  z-index: 1;
  color: ${({color}) => color} !important;
  font-size: ${({fontSize}) => 1 + fontSize / 10}em !important;
	overflow-scrolling: touch;
	overflow-y: scroll;
	overflow-x: hidden;
	height: ${({height}) => height - 160}px;
`;

interface TextSelectionPopoverProps {
	left: number;
	width: number;
	top: number;
	shadow: boolean;
	background: Color;
}

const TextSelectionPopover = styled.div<TextSelectionPopoverProps>`
  position: absolute;
  left: ${({left, width}) => left + width / 2}px;
  top: ${({top}) => top - 50}px;
  margin-left: -35px;
  width: 70px;
  height: 40px;
  border-radius: 20px;
  padding: 10px;
  display: flex;
  flex-direction: row;
  column-gap: 10px;
  background: ${({background}) => background};

  ${({shadow}) => shadow && css`
    box-shadow: 0 10px 30px 0 #00000029;
  `}
`;

interface HighlightButtonProps {
	color: Color;
	background: Color;
}

const HighlightButton = styled.div<HighlightButtonProps>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({color}) => color};
  position: relative;

  & > div {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 70%;
    height: 70%;
    border-radius: 50%;
    border: 3px solid ${({color}) => color};
    transform: translate(-50%, -50%);
    transition: all 336ms;
  }

  &:hover {
    & > div {
      border-color: ${({background}) => background};
    }
  }
`;

const renderTextSelection = (shadow: boolean, background: Color, onHighlightClick: (className: string, range: Range) => void): FunctionComponent<ReturnType<typeof useTextSelection>> => (
	{
		clientRect,
		isCollapsed,
	},
) => {
	if (!clientRect || isCollapsed) return null;

	const onHighlightButtonClick = (className: string) => () => {
		const range = window.getSelection()!.getRangeAt(0);

		onHighlightClick(className, range);
	};

	return (
		<TextSelectionPopover left={clientRect?.left || 0} top={clientRect?.top || 0} width={clientRect?.width || 0}
													shadow={shadow} background={background}>
			<HighlightButton color={Color.CORNSILK} background={background} onClick={onHighlightButtonClick('color_1')}>
				<div />
			</HighlightButton>
			<HighlightButton color={Color.TURQUOISE} background={background} onClick={onHighlightButtonClick('color_1')}>
				<div />
			</HighlightButton>
		</TextSelectionPopover>
	);
};

interface Highlight {
	range: Range;
	className: string;
}

export const Reader = () => {
	const history = useHistory();

	const {
		book: {data, currentChapter},
		settings: {theme: {foreground, secondaryBackground, shadow, background}, fontSize},
	} = useSelector((state: RootState) => state);

	const [isLoading, setLoading] = useState(false);
	const [html, setHtml] = useState('');
	const [highlights, setHighlights] = useState<Highlight[]>([]);

	const {height} = useWindowSize();

	useEffect(() => {
		if (!data)
			history.push('/');
	}, [data, history]);

	useEffect(() => {
		setLoading(true);
		if (data) {
			const currentChapterId = data.content.chapters[currentChapter].idref;

			const chapter = data.content.items.find(({id}) => id === currentChapterId);

			if (!chapter)
				return;

			data.result.file(chapter.href)?.async('string')?.then(data => {
				setHtml(data);
				setLoading(false);
			});
		}
	}, [currentChapter, data]);

	useEffect(() => {
		highlights.forEach(({range, className}) => {
			const span = document.createElement('span');

			span.className = `highlight ${className}`;
			span.appendChild(range.extractContents());
			range.insertNode(span);
		});
	});

	const transform: Transform = (node, index) => {
		const removeNodes = [
			'img',
			'header',
		];
		const turnNodes = [
			'html',
			'body',
		];

		if (removeNodes.includes(node.name)) return null;
		if (turnNodes.includes(node.name)) {
			node.name = 'div';
			return convertNodeToElement(node, index, transform);
		}
	};

	const onHighlightClick = () => (className: string, range: Range) => {
		setHighlights(highlights => [...highlights, {
			range,
			className,
		}]);
	};

	return (
		<Page>
			<BackHomeContainer>
				<BackHome />
			</BackHomeContainer>
			<SelectStyleContainer>
				<SelectStyle />
			</SelectStyleContainer>
			<ChaptersMenuContainer>
				<ChaptersMenu />
			</ChaptersMenuContainer>
			<Container background={background}>
				{
					isLoading ?
						<></> :
						<ContentContainer background={background} height={height} color={foreground} fontSize={fontSize}>
							<Popover render={renderTextSelection(shadow, secondaryBackground, onHighlightClick())} />
							{ReactHtmlParser(html, {
								transform: transform,
							})}
						</ContentContainer>
				}
			</Container>
			<ChapterController />
		</Page>
	);
};
